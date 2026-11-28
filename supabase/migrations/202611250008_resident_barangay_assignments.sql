begin;

alter table public.barangays add column if not exists psgc_code text;
create unique index if not exists barangays_psgc_code_unique
  on public.barangays (psgc_code) where psgc_code is not null;

create table public.resident_barangay_requests (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.profiles(id) on delete cascade,
  barangay_id uuid not null references public.barangays(id),
  psgc_code text not null,
  barangay_name text not null,
  municipality text not null,
  province text not null,
  region text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  requested_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index resident_barangay_requests_one_pending
  on public.resident_barangay_requests (resident_id)
  where status = 'PENDING';

alter table public.resident_barangay_requests enable row level security;
revoke all on public.resident_barangay_requests from public, anon, authenticated;

create or replace function public.admin_resident_accounts()
returns table (id uuid, name text, email text, barangay_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_status = 'ACTIVE' and p.role = 'ADMIN'
  ) then
    raise exception 'Administrator access required.';
  end if;

  return query
    select p.id, p.full_name::text, u.email::text, b.name::text
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.barangays b on b.id = p.barangay_id
    where p.account_status = 'ACTIVE' and p.role = 'RESIDENT'
    order by p.full_name, p.id;
end;
$$;

create or replace function public.admin_create_resident_area_request(
  resident_account_id uuid,
  selected_psgc_code text,
  selected_barangay_name text,
  selected_municipality text,
  selected_province text,
  selected_region text
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  area_id uuid;
  request_id uuid;
  existing_code text;
  normalized_city text;
  normalized_province text;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_status = 'ACTIVE' and p.role = 'ADMIN'
  ) then
    raise exception 'Administrator access required.';
  end if;
  if resident_account_id is null or selected_psgc_code is null or selected_psgc_code !~ '^[0-9]{10}$'
    or nullif(trim(selected_barangay_name), '') is null
    or nullif(trim(selected_municipality), '') is null
    or nullif(trim(selected_province), '') is null
    or nullif(trim(selected_region), '') is null then
    raise exception 'Select a resident and a complete PSGC barangay.';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = resident_account_id and p.account_status = 'ACTIVE' and p.role = 'RESIDENT'
  ) then
    raise exception 'The selected resident does not have an active resident profile.';
  end if;

  normalized_city := lower(regexp_replace(regexp_replace(trim(selected_municipality), '^(city|municipality) of ', '', 'i'), ' (city|municipality)$', '', 'i'));
  normalized_province := case
    when lower(trim(selected_region)) in ('national capital region', 'ncr')
      and lower(trim(selected_province)) in ('metro manila', 'national capital region', 'ncr') then 'ncr'
    else lower(trim(selected_province))
  end;
  select b.id, b.psgc_code into area_id, existing_code
  from public.barangays b
  where b.is_active
    and lower(trim(b.name)) = lower(trim(selected_barangay_name))
    and (case
      when lower(trim(selected_region)) in ('national capital region', 'ncr')
        and lower(trim(b.province)) in ('metro manila', 'national capital region', 'ncr') then 'ncr'
      else lower(trim(b.province))
    end) = normalized_province
    and lower(regexp_replace(regexp_replace(trim(b.municipality), '^(city|municipality) of ', '', 'i'), ' (city|municipality)$', '', 'i')) = normalized_city
  limit 2;
  if area_id is null then
    raise exception 'This PSGC barangay is not configured as an active barangay in Supabase. Add or correct its barangay record first.';
  end if;
  if exists (
    select 1 from public.barangays b
    where b.is_active
      and lower(trim(b.name)) = lower(trim(selected_barangay_name))
      and (case
        when lower(trim(selected_region)) in ('national capital region', 'ncr')
          and lower(trim(b.province)) in ('metro manila', 'national capital region', 'ncr') then 'ncr'
        else lower(trim(b.province))
      end) = normalized_province
      and lower(regexp_replace(regexp_replace(trim(b.municipality), '^(city|municipality) of ', '', 'i'), ' (city|municipality)$', '', 'i')) = normalized_city
      and b.id <> area_id
  ) then
    raise exception 'More than one active Supabase barangay matches this PSGC selection. Resolve the duplicate before requesting assignment.';
  end if;
  if existing_code is not null and existing_code <> selected_psgc_code then
    raise exception 'This Supabase barangay is already linked to a different PSGC code.';
  end if;
  if exists (
    select 1 from public.barangays b where b.psgc_code = selected_psgc_code and b.id <> area_id
  ) then
    raise exception 'This PSGC code is already linked to a different Supabase barangay.';
  end if;
  if exists (
    select 1 from public.profiles p where p.id = resident_account_id and p.barangay_id = area_id
  ) then
    raise exception 'This resident is already assigned to the selected barangay.';
  end if;

  update public.barangays set psgc_code = selected_psgc_code
  where id = area_id and psgc_code is null;

  insert into public.resident_barangay_requests (
    resident_id, barangay_id, psgc_code, barangay_name, municipality, province, region, requested_by
  ) values (
    resident_account_id, area_id, selected_psgc_code, trim(selected_barangay_name),
    trim(selected_municipality), trim(selected_province), trim(selected_region), auth.uid()
  )
  on conflict (resident_id) where status = 'PENDING'
  do update set
    barangay_id = excluded.barangay_id,
    psgc_code = excluded.psgc_code,
    barangay_name = excluded.barangay_name,
    municipality = excluded.municipality,
    province = excluded.province,
    region = excluded.region,
    requested_by = excluded.requested_by,
    created_at = now()
  returning id into request_id;

  return request_id;
end;
$$;

create or replace function public.staff_resident_area_requests()
returns table (
  id uuid,
  resident_id uuid,
  resident_name text,
  resident_email text,
  psgc_code text,
  barangay_name text,
  municipality text,
  province text,
  region text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_status = 'ACTIVE' and p.role in ('ADMIN', 'OFFICIAL')
  ) then
    raise exception 'Active administrator or official access required.';
  end if;

  return query
    select r.id, r.resident_id, p.full_name::text, u.email::text,
      r.psgc_code, r.barangay_name, r.municipality, r.province, r.region, r.created_at
    from public.resident_barangay_requests r
    join public.profiles p on p.id = r.resident_id
    join auth.users u on u.id = p.id
    where r.status = 'PENDING'
    order by r.created_at, r.id;
end;
$$;

create or replace function public.staff_review_resident_area_request(request_id uuid, approved boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  pending_request public.resident_barangay_requests%rowtype;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_status = 'ACTIVE' and p.role in ('ADMIN', 'OFFICIAL')
  ) then
    raise exception 'Active administrator or official access required.';
  end if;

  select r.* into pending_request
  from public.resident_barangay_requests r
  where r.id = request_id and r.status = 'PENDING'
  for update;
  if not found then
    raise exception 'This resident area request is no longer pending.';
  end if;

  if approved then
    if not exists (
      select 1 from public.barangays b
      where b.id = pending_request.barangay_id and b.is_active
    ) then
      raise exception 'The requested Supabase barangay is no longer active.';
    end if;
    update public.profiles p set barangay_id = pending_request.barangay_id
    where p.id = pending_request.resident_id
      and p.account_status = 'ACTIVE' and p.role = 'RESIDENT';
    if not found then
      raise exception 'The resident no longer has an active resident profile.';
    end if;
    update public.resident_barangay_requests
    set status = 'APPROVED', reviewed_by = auth.uid(), reviewed_at = now()
    where id = request_id;
  else
    update public.resident_barangay_requests
    set status = 'REJECTED', reviewed_by = auth.uid(), reviewed_at = now()
    where id = request_id;
  end if;
end;
$$;

revoke all on function public.admin_resident_accounts() from public, anon;
revoke all on function public.admin_create_resident_area_request(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.staff_resident_area_requests() from public, anon;
revoke all on function public.staff_review_resident_area_request(uuid, boolean) from public, anon;
grant execute on function public.admin_resident_accounts() to authenticated;
grant execute on function public.admin_create_resident_area_request(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.staff_resident_area_requests() to authenticated;
grant execute on function public.staff_review_resident_area_request(uuid, boolean) to authenticated;

commit;
