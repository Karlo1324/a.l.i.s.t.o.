begin;

create table public.responder_access_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz
);

create unique index responder_access_requests_one_pending
  on public.responder_access_requests (profile_id)
  where status = 'PENDING';

alter table public.responder_access_requests enable row level security;
revoke all on public.responder_access_requests from public, anon, authenticated;

create or replace function public.alisto_create_resident_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, account_status)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Resident'),
          'RESIDENT', 'ACTIVE')
  on conflict (id) do update set role = 'RESIDENT';

  if upper(coalesce(new.raw_user_meta_data->>'requested_role', '')) = 'OFFICIAL' then
    insert into public.responder_access_requests (profile_id)
    values (new.id)
    on conflict (profile_id) where status = 'PENDING' do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.alisto_create_resident_profile() from public, anon, authenticated;

create function public.admin_responder_access_requests()
returns table (
  request_id uuid,
  profile_id uuid,
  profile_name text,
  profile_email text,
  requested_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  actor_role text;
begin
  select p.role into actor_role
  from public.profiles p
  where p.id = auth.uid() and p.account_status = 'ACTIVE';

  if actor_role is distinct from 'ADMIN' then
    raise exception 'Administrator access is required.';
  end if;

  return query
  select r.id, p.id, p.full_name::text, u.email::text, r.requested_at
  from public.responder_access_requests r
  join public.profiles p on p.id = r.profile_id
  join auth.users u on u.id = p.id
  where r.status = 'PENDING'
    and p.role = 'RESIDENT'
    and p.account_status = 'ACTIVE'
    and u.email_confirmed_at is not null
  order by r.requested_at;
end;
$$;

create function public.admin_review_responder_access_request(request_id uuid, approved boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  target_profile_id uuid;
begin
  select p.role into actor_role
  from public.profiles p
  where p.id = actor_id and p.account_status = 'ACTIVE';

  if actor_role is distinct from 'ADMIN' then
    raise exception 'Administrator access is required.';
  end if;

  select r.profile_id into target_profile_id
  from public.responder_access_requests r
  where r.id = request_id and r.status = 'PENDING'
  for update;

  if not found then raise exception 'This responder access request is no longer pending.'; end if;

  if approved then
    update public.profiles p
    set role = 'OFFICIAL'
    from auth.users u
    where p.id = target_profile_id
      and u.id = p.id
      and u.email_confirmed_at is not null
      and p.account_status = 'ACTIVE'
      and p.role = 'RESIDENT';
    if not found then raise exception 'The account must be active, confirmed, and still a resident to approve it.'; end if;
  end if;

  update public.responder_access_requests
  set status = case when approved then 'APPROVED' else 'REJECTED' end,
      reviewed_by = actor_id,
      reviewed_at = now()
  where id = request_id;
end;
$$;

revoke all on function public.admin_responder_access_requests() from public, anon;
grant execute on function public.admin_responder_access_requests() to authenticated;
revoke all on function public.admin_review_responder_access_request(uuid, boolean) from public, anon;
grant execute on function public.admin_review_responder_access_request(uuid, boolean) to authenticated;

commit;
