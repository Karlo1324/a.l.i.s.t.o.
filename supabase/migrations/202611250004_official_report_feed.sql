begin;
create function public.official_reporting_area() returns uuid
language sql stable security definer set search_path='' as $$
  select coalesce(p.barangay_id,(select b.id from public.barangays b where b.is_active
    and (select count(*) from public.barangays where is_active)=1))
  from public.profiles p where p.id=auth.uid() and p.role='OFFICIAL' and p.account_status='ACTIVE';
$$;

create function public.official_reports() returns setof jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'reporter',jsonb_build_object('id',p.id,'name',p.full_name,'phone',coalesce(p.phone,''),'verified',false),
    'id',r.id,'code',r.report_no,'title',r.title,'description',r.description,'category',r.app_category,
    'status',r.status,'lat',extensions.st_y(r.location::extensions.geometry),'lng',extensions.st_x(r.location::extensions.geometry),
    'landmark',r.landmark,'affected',r.people_affected,'danger',r.people_in_danger,'anonymous',r.hide_name,
    'createdAt',r.submitted_at,'updatedAt',r.updated_at,'paths',coalesce((select jsonb_agg(i.object_path order by i.uploaded_at)
      from public.report_images i where i.report_id=r.id and i.uploader_id=auth.uid() and i.kind='REPORT'),'[]'::jsonb))
  from public.damage_reports r join public.profiles p on p.id=r.reporter_id where r.barangay_id=public.official_reporting_area() and r.app_category is not null
  order by r.submitted_at desc;
$$;

create function public.official_can_read_evidence(path text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.report_images i join public.damage_reports r on r.id=i.report_id
    where i.object_path=path and i.bucket_name='incident-evidence' and r.barangay_id=public.official_reporting_area());
$$;
revoke all on function public.official_reports(), public.official_reporting_area(), public.official_can_read_evidence(text) from public, anon;
grant execute on function public.official_reports(), public.official_reporting_area(), public.official_can_read_evidence(text) to authenticated;

drop policy alisto_evidence_read_scope on storage.objects;
create policy alisto_evidence_read_scope on storage.objects as restrictive for select to authenticated
using(bucket_id <> 'incident-evidence' or (storage.foldername(name))[1]=auth.uid()::text or public.official_can_read_evidence(name));
create policy alisto_evidence_anon_scope on storage.objects as restrictive for select to anon using(bucket_id <> 'incident-evidence');
create policy alisto_official_read_evidence on storage.objects for select to authenticated
using(bucket_id='incident-evidence' and public.official_can_read_evidence(name));
commit;
