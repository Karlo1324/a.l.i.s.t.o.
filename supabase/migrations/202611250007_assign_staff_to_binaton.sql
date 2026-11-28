begin;

do $$
declare
  area_id uuid;
begin
  select b.id into strict area_id
  from public.barangays b
  where b.is_active
    and to_jsonb(b)::text ilike '%Binaton%';

  update public.profiles
  set barangay_id = area_id
  where role in ('ADMIN', 'OFFICIAL')
    and account_status = 'ACTIVE';
end;
$$;

commit;
