-- Apply after the team's initial schema has created public.profiles.
begin;
create or replace function public.alisto_create_resident_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, role, account_status)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Resident'),
          nullif(trim(new.raw_user_meta_data->>'phone'), ''), 'RESIDENT', 'ACTIVE');
  return new;
end;
$$;
revoke all on function public.alisto_create_resident_profile() from public, anon, authenticated;
create trigger alisto_create_resident_profile
after insert on auth.users
for each row execute function public.alisto_create_resident_profile();
commit;
