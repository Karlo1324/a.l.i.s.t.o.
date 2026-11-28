begin;

create or replace function public.submit_resident_report(d jsonb)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  rid uuid := (d->>'id')::uuid;
  area uuid;
  cat smallint;
  category_key text;
  ref text;
  photo text;
  obj storage.objects%rowtype;
  lat double precision := (d->>'lat')::double precision;
  lng double precision := (d->>'lng')::double precision;
begin
  select barangay_id into area
  from public.profiles
  where id = uid and account_status = 'ACTIVE';

  if not found then
    raise exception 'An active profile is required.';
  end if;

  select report_no into ref
  from public.damage_reports
  where id = rid and reporter_id = uid;

  if found then return ref; end if;

  if area is null then
    select id into area
    from public.barangays
    where is_active
      and (select count(*) from public.barangays where is_active) = 1;
  end if;

  if area is null then
    raise exception 'Ask your barangay to assign your profile to a reporting area.';
  end if;

  category_key := case lower(coalesce(d->>'category', ''))
    when 'flooding' then 'flooding'
    when 'flood' then 'flooding'
    when 'road' then 'road'
    when 'road damage' then 'road'
    when 'building' then 'building'
    when 'building damage' then 'building'
    when 'tree' then 'tree'
    when 'fallen trees' then 'tree'
    when 'landslide' then 'landslide'
    when 'landslides' then 'landslide'
    when 'electrical' then 'electrical'
    when 'electrical hazards' then 'electrical'
    when 'other' then 'other'
    when 'other infrastructure' then 'other'
    else null
  end;

  select c.id into cat
  from public.damage_categories c
  where c.is_active
    and case category_key
      when 'flooding' then lower(c.code) like '%flood%'
      when 'road' then lower(c.code) like '%road%'
      when 'building' then lower(c.code) like '%building%' or lower(c.code) like '%structur%'
      when 'tree' then lower(c.code) like '%tree%' or lower(c.code) like '%fallen%'
      when 'landslide' then lower(c.code) like '%landslide%'
      when 'electrical' then lower(c.code) like '%electri%' or lower(c.code) like '%power%'
      when 'other' then lower(c.code) like '%other%' or lower(c.code) like '%infrastructure%'
      else false
    end
  order by
    case
      when category_key = 'flooding' and lower(c.code) in ('flood', 'flooding') then 0
      when category_key = 'road' and lower(c.code) in ('road', 'road_damage') then 0
      when category_key = 'building' and lower(c.code) in ('building', 'building_damage') then 0
      when category_key = 'tree' and lower(c.code) in ('tree', 'fallen_tree', 'fallen_trees') then 0
      when category_key = 'landslide' and lower(c.code) in ('landslide', 'landslides') then 0
      when category_key = 'electrical' and lower(c.code) in ('electrical', 'electrical_hazard', 'electrical_hazards') then 0
      when category_key = 'other' and lower(c.code) in ('other', 'other_infrastructure') then 0
      else 1
    end,
    lower(c.code)
  limit 1;

  if cat is null then
    raise exception 'No active report category is configured for "%". Ask an administrator to enable a matching category.',
      coalesce(d->>'category', 'unknown');
  end if;

  if lat is null or lng is null or lat not between -90 and 90 or lng not between -180 and 180
     or jsonb_typeof(d->'paths') is distinct from 'array'
     or jsonb_array_length(case
       when jsonb_typeof(d->'paths') = 'array' then d->'paths'
       else '[]'::jsonb
     end) > 6 then
    raise exception 'Invalid report location or attachments.';
  end if;

  ref := 'ALI-' || rid::text;
  insert into public.damage_reports(
    id, report_no, reporter_id, barangay_id, category_id, title, description, location,
    location_source, landmark, people_affected, people_in_danger, hide_name, app_category
  )
  values (
    rid, ref, uid, area, cat, d->>'title', d->>'description',
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326),
    d->>'source', d->>'landmark', (d->>'affected')::integer,
    (d->>'danger')::boolean, (d->>'anonymous')::boolean, category_key
  );

  for photo in select jsonb_array_elements_text(d->'paths') loop
    select * into obj
    from storage.objects
    where bucket_id = 'incident-evidence'
      and name = photo
      and split_part(name, '/', 1) = uid::text
      and split_part(name, '/', 2) = rid::text;

    if not found then
      raise exception 'An uploaded report photo could not be verified. Remove the photo and attach it again.';
    end if;

    insert into public.report_images(report_id, uploader_id, bucket_name, object_path, mime_type, byte_size, kind)
    values (rid, uid, obj.bucket_id, photo, obj.metadata->>'mimetype', (obj.metadata->>'size')::integer, 'REPORT');
  end loop;

  return ref;
end;
$$;

revoke all on function public.submit_resident_report(jsonb) from public, anon;
grant execute on function public.submit_resident_report(jsonb) to authenticated;

commit;
