begin;

-- The API and trusted administrators own profile provisioning and role updates.
alter table public.profiles enable row level security;
revoke insert, update, delete, truncate on public.profiles from public, anon, authenticated;

create or replace function public.current_staff_profile()
returns table (id uuid, full_name text, role text)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.full_name::text, p.role::text
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.account_status = 'ACTIVE'
    and p.role in ('ADMIN', 'OFFICIAL', 'RESPONDER');
$$;

revoke all on function public.current_staff_profile() from public, anon;
grant execute on function public.current_staff_profile() to authenticated;
commit;
