begin;

create or replace function public.admin_accounts()
returns table(id uuid, name text, email text, role text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid()
    and p.account_status = 'ACTIVE' and p.role = 'ADMIN') then
    raise exception 'Administrator access required.';
  end if;
  return query select p.id, p.full_name::text, u.email::text, lower(p.role::text)
    from public.profiles p join auth.users u on u.id = p.id order by p.full_name, p.id;
end;
$$;

create or replace function public.admin_add_staff(account_email text, staff_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid()
    and account_status = 'ACTIVE' and role = 'ADMIN') then
    raise exception 'Administrator access required.';
  end if;
  if staff_role is null or staff_role not in ('RESPONDER','ADMIN') then
    raise exception 'Select a responder or administrator role.';
  end if;
  update public.profiles p set role = staff_role
    from auth.users u where p.id = u.id and lower(u.email) = lower(trim(account_email))
      and u.email_confirmed_at is not null and p.account_status = 'ACTIVE'
      and p.id <> auth.uid() and (p.role in ('RESIDENT','OFFICIAL','RESPONDER') or p.role = staff_role);
  if not found then
    raise exception 'Choose another registered account with a confirmed email and active profile. Existing administrators cannot be demoted here.';
  end if;
end;
$$;

revoke all on function public.admin_accounts(), public.admin_add_staff(text,text) from public, anon;
grant execute on function public.admin_accounts(), public.admin_add_staff(text,text) to authenticated;
commit;
