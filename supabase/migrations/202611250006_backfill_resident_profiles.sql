begin;

insert into public.profiles (id, full_name, role, account_status)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), 'Resident'),
  'RESIDENT',
  'ACTIVE'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

commit;
