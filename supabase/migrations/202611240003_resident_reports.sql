begin;
alter table public.damage_reports
  add column if not exists people_affected integer not null default 0 check (people_affected >= 0),
  add column if not exists people_in_danger boolean not null default false,
  add column if not exists hide_name boolean not null default false,
  add column if not exists app_category text;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('incident-evidence','incident-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy alisto_resident_evidence_insert on storage.objects for insert to authenticated
with check (bucket_id='incident-evidence' and (storage.foldername(name))[1]=auth.uid()::text);
create policy alisto_resident_evidence_read on storage.objects for select to authenticated
using (bucket_id='incident-evidence' and (storage.foldername(name))[1]=auth.uid()::text);

create function public.submit_resident_report(d jsonb) returns text
language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid();
  rid uuid := (d->>'id')::uuid;
  area uuid;
  cat smallint;
  ref text;
  photo text;
  obj storage.objects%rowtype;
  lat double precision := (d->>'lat')::double precision;
  lng double precision := (d->>'lng')::double precision;
begin
  select barangay_id into area from public.profiles where id=uid and account_status='ACTIVE';
  if not found then raise exception 'An active profile is required.'; end if;
  select report_no into ref from public.damage_reports where id=rid and reporter_id=uid;
  if found then return ref; end if;
  if area is null then
    select id into area from public.barangays where is_active and (select count(*) from public.barangays where is_active)=1;
  end if;
  if area is null then raise exception 'Ask your barangay to assign your profile to a reporting area.'; end if;
  select id into strict cat from public.damage_categories where is_active and
    lower(code) like (case d->>'category' when 'flooding' then 'flood' when 'road' then 'road'
    when 'building' then 'building' when 'tree' then 'fallen' when 'landslide' then 'landslide'
    when 'electrical' then 'electrical' when 'other' then 'other' end || '%');
  if lat is null or lng is null or lat not between -90 and 90 or lng not between -180 and 180
     or jsonb_array_length(d->'paths') > 6 then raise exception 'Invalid report location or attachments.'; end if;
  ref := 'ALI-' || rid::text;
  insert into public.damage_reports(id,report_no,reporter_id,barangay_id,category_id,title,description,location,
    location_source,landmark,people_affected,people_in_danger,hide_name,app_category)
  values(rid,ref,uid,area,cat,d->>'title',d->>'description',extensions.st_setsrid(extensions.st_makepoint(lng,lat),4326),
    d->>'source',d->>'landmark',(d->>'affected')::integer,(d->>'danger')::boolean,(d->>'anonymous')::boolean,d->>'category');
  for photo in select jsonb_array_elements_text(d->'paths') loop
    select * into strict obj from storage.objects where bucket_id='incident-evidence' and name=photo
      and split_part(name,'/',1)=uid::text and split_part(name,'/',2)=rid::text;
    insert into public.report_images(report_id,uploader_id,bucket_name,object_path,mime_type,byte_size,kind)
    values(rid,uid,obj.bucket_id,photo,obj.metadata->>'mimetype',(obj.metadata->>'size')::integer,'REPORT');
  end loop;
  return ref;
end $$;
revoke all on function public.submit_resident_report(jsonb) from public,anon;
grant execute on function public.submit_resident_report(jsonb) to authenticated;
create function public.my_resident_reports() returns setof jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id',r.id,'code',r.report_no,'title',r.title,'description',r.description,'category',r.app_category,
    'status',r.status,'lat',extensions.st_y(r.location::extensions.geometry),'lng',extensions.st_x(r.location::extensions.geometry),
    'landmark',r.landmark,'affected',r.people_affected,'danger',r.people_in_danger,'anonymous',r.hide_name,
    'createdAt',r.submitted_at,'updatedAt',r.updated_at,'paths',coalesce((select jsonb_agg(i.object_path order by i.uploaded_at)
      from public.report_images i where i.report_id=r.id and i.uploader_id=auth.uid() and i.kind='REPORT'),'[]'::jsonb))
  from public.damage_reports r where r.reporter_id=auth.uid() and r.app_category is not null
  order by r.submitted_at desc;
$$;
revoke all on function public.my_resident_reports() from public,anon;
grant execute on function public.my_resident_reports() to authenticated;
commit;
