begin;

alter table public.profiles alter column role set default 'RESIDENT';

create or replace function public.alisto_create_resident_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, account_status)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Resident'),
          'RESIDENT', 'ACTIVE')
  on conflict (id) do update set role = 'RESIDENT';

  return new;
end;
$$;

revoke all on function public.alisto_create_resident_profile() from public, anon, authenticated;
drop trigger if exists alisto_create_resident_profile on auth.users;
drop trigger if exists zzzz_alisto_create_resident_profile on auth.users;
create trigger zzzz_alisto_create_resident_profile after insert on auth.users
for each row execute function public.alisto_create_resident_profile();

commit;
