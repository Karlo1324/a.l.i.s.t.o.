begin;

update public.profiles
set role = 'OFFICIAL'
where role = 'RESPONDER';

create or replace function public.current_staff_profile()
returns table (id uuid, full_name text, role text)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.full_name::text, p.role::text
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.account_status = 'ACTIVE'
    and p.role in ('ADMIN', 'OFFICIAL');
$$;

create or replace function public.admin_add_staff(account_email text, staff_role text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_status = 'ACTIVE' and p.role = 'ADMIN'
  ) then
    raise exception 'Administrator access required.';
  end if;
  if staff_role is null or staff_role not in ('OFFICIAL', 'ADMIN') then
    raise exception 'Select a responder/official or administrator role.';
  end if;
  update public.profiles p set role = staff_role
  from auth.users u
  where p.id = u.id
    and lower(u.email) = lower(trim(account_email))
    and u.email_confirmed_at is not null
    and p.account_status = 'ACTIVE'
    and p.id <> auth.uid()
    and (p.role in ('RESIDENT', 'OFFICIAL') or p.role = staff_role);
  if not found then
    raise exception 'Choose another registered account with a confirmed email and active profile. Existing administrators cannot be demoted here.';
  end if;
end;
$$;

revoke all on function public.current_staff_profile() from public, anon;
grant execute on function public.current_staff_profile() to authenticated;
revoke all on function public.admin_add_staff(text, text) from public, anon;
grant execute on function public.admin_add_staff(text, text) to authenticated;

commit;
