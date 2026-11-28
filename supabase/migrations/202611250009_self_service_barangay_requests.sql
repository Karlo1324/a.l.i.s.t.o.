begin;

create or replace function public.resolve_active_psgc_barangay(
  selected_psgc_code text,
  selected_barangay_name text,
  selected_municipality text,
  selected_province text,
  selected_region text
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  matched_ids uuid[];
  matched_codes text[];
  area_id uuid;
  existing_code text;
  normalized_city text;
  normalized_province text;
begin
  if selected_psgc_code is null or selected_psgc_code !~ '^[0-9]{10}$'
    or nullif(trim(selected_barangay_name), '') is null
    or nullif(trim(selected_municipality), '') is null
    or nullif(trim(selected_province), '') is null
    or nullif(trim(selected_region), '') is null then
    raise exception 'Select a complete PSGC barangay.';
  end if;

  normalized_city := lower(regexp_replace(regexp_replace(trim(selected_municipality), '^(city|municipality) of ', '', 'i'), ' (city|municipality)$', '', 'i'));
  normalized_province := case
    when lower(trim(selected_region)) in ('national capital region', 'ncr')
      and lower(trim(selected_province)) in ('metro manila', 'national capital region', 'ncr') then 'ncr'
    else lower(trim(selected_province))
  end;
  select array_agg(b.id order by b.id), array_agg(b.psgc_code order by b.id)
  into matched_ids, matched_codes
  from public.barangays b
  where b.is_active
    and lower(trim(b.name)) = lower(trim(selected_barangay_name))
    and (case
      when lower(trim(selected_region)) in ('national capital region', 'ncr')
        and lower(trim(b.province)) in ('metro manila', 'national capital region', 'ncr') then 'ncr'
      else lower(trim(b.province))
    end) = normalized_province
    and lower(regexp_replace(regexp_replace(trim(b.municipality), '^(city|municipality) of ', '', 'i'), ' (city|municipality)$', '', 'i')) = normalized_city;

  if coalesce(cardinality(matched_ids), 0) = 0 then
    raise exception 'This PSGC barangay is not configured as an active barangay in Supabase.';
  end if;
  if cardinality(matched_ids) <> 1 then
    raise exception 'More than one active Supabase barangay matches this PSGC selection. Ask an administrator to resolve the duplicate.';
  end if;
  area_id := matched_ids[1];
  existing_code := matched_codes[1];

  if existing_code is not null and existing_code <> selected_psgc_code then
    raise exception 'This Supabase barangay is already linked to a different PSGC code.';
  end if;
  if exists (
    select 1 from public.barangays b
    where b.psgc_code = selected_psgc_code and b.id <> area_id
  ) then
    raise exception 'This PSGC code is already linked to a different Supabase barangay.';
  end if;

  update public.barangays set psgc_code = selected_psgc_code
  where id = area_id and psgc_code is null;
  return area_id;
end;
$$;

create or replace function public.request_my_profile_area(
  selected_psgc_code text,
  selected_barangay_name text,
  selected_municipality text,
  selected_province text,
  selected_region text
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  profile_area_id uuid;
  area_id uuid;
  request_id uuid;
begin
  select p.barangay_id into profile_area_id
  from public.profiles p
  where p.id = auth.uid()
    and p.account_status = 'ACTIVE'
    and p.role in ('RESIDENT', 'RESPONDER', 'OFFICIAL', 'ADMIN');
  if not found then
    raise exception 'An active resident or staff profile is required.';
  end if;
  if profile_area_id is not null then
    raise exception 'Your profile already has a reporting area. Contact an administrator if it needs to change.';
  end if;

  area_id := public.resolve_active_psgc_barangay(
    selected_psgc_code,
    selected_barangay_name,
    selected_municipality,
    selected_province,
    selected_region
  );

  insert into public.resident_barangay_requests (
    resident_id, barangay_id, psgc_code, barangay_name, municipality, province, region, requested_by
  ) values (
    auth.uid(), area_id, selected_psgc_code, trim(selected_barangay_name),
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

create or replace function public.my_profile_area()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  profile_row public.profiles%rowtype;
  area_name text;
  pending_request public.resident_barangay_requests%rowtype;
  pending_data jsonb;
begin
  select p.* into profile_row
  from public.profiles p
  where p.id = auth.uid() and p.account_status = 'ACTIVE';
  if not found then
    raise exception 'An active profile is required.';
  end if;

  select b.name into area_name
  from public.barangays b where b.id = profile_row.barangay_id;

  select r.* into pending_request
  from public.resident_barangay_requests r
  where r.resident_id = profile_row.id and r.status = 'PENDING'
  order by r.created_at desc
  limit 1;
  if found then
    pending_data := jsonb_build_object(
      'id', pending_request.id,
      'psgc_code', pending_request.psgc_code,
      'barangay_name', pending_request.barangay_name,
      'municipality', pending_request.municipality,
      'province', pending_request.province,
      'region', pending_request.region
    );
  end if;

  return jsonb_build_object(
    'role', profile_row.role,
    'barangay_id', profile_row.barangay_id,
    'barangay_name', area_name,
    'pending', pending_data
  );
end;
$$;

create or replace function public.staff_profile_area_requests()
returns table (
  id uuid,
  profile_id uuid,
  profile_name text,
  profile_email text,
  profile_role text,
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
    select r.id, r.resident_id, p.full_name::text, u.email::text, p.role::text,
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
    raise exception 'This barangay assignment request is no longer pending.';
  end if;
  if pending_request.resident_id = auth.uid() then
    raise exception 'You cannot review your own barangay assignment request.';
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
      and p.account_status = 'ACTIVE'
      and p.role in ('RESIDENT', 'RESPONDER', 'OFFICIAL', 'ADMIN');
    if not found then
      raise exception 'The profile is no longer active.';
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

revoke all on function public.resolve_active_psgc_barangay(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.request_my_profile_area(text, text, text, text, text) from public, anon;
revoke all on function public.my_profile_area() from public, anon;
revoke all on function public.staff_profile_area_requests() from public, anon;
revoke all on function public.staff_review_resident_area_request(uuid, boolean) from public, anon;
grant execute on function public.request_my_profile_area(text, text, text, text, text) to authenticated;
grant execute on function public.my_profile_area() to authenticated;
grant execute on function public.staff_profile_area_requests() to authenticated;
grant execute on function public.staff_review_resident_area_request(uuid, boolean) to authenticated;

commit;
