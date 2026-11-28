begin;

do $$
declare
  target_id uuid;
  target_role text;
  target_status text;
  email_confirmed_at timestamptz;
begin
  select p.id, p.role, p.account_status, u.email_confirmed_at
  into target_id, target_role, target_status, email_confirmed_at
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower('karlofamoso4@gmail.com');

  if not found then
    raise exception 'No profile was found for karlofamoso4@gmail.com. Create the account and resident profile first.';
  end if;
  if target_status <> 'ACTIVE' or email_confirmed_at is null then
    raise exception 'karlofamoso4@gmail.com must have a confirmed email and active profile before becoming an administrator.';
  end if;
  if target_role not in ('RESIDENT', 'OFFICIAL', 'RESPONDER', 'ADMIN') then
    raise exception 'The account has an unsupported role and was not changed.';
  end if;

  update public.profiles
  set role = 'ADMIN'
  where id = target_id;
end;
$$;

commit;
