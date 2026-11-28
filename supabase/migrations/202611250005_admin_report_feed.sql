begin;
create or replace function public.official_reporting_area() returns uuid
language sql stable security definer set search_path='' as $$
  select coalesce(p.barangay_id,(select b.id from public.barangays b where b.is_active
    and (select count(*) from public.barangays where is_active)=1))
  from public.profiles p where p.id=auth.uid() and p.role in ('OFFICIAL','ADMIN') and p.account_status='ACTIVE';
$$;

create or replace function public.official_reports() returns setof jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'reporter',jsonb_build_object('id',p.id,'name',p.full_name,'phone',coalesce(p.phone,''),'verified',false),
    'id',r.id,'code',r.report_no,'title',r.title,'description',r.description,'category',coalesce(r.app_category, case
      when lower(c.code) like 'flood%' then 'flooding' when lower(c.code) like 'road%' then 'road'
      when lower(c.code) like 'building%' then 'building' when lower(c.code) like 'fallen%' then 'tree'
      when lower(c.code) like 'landslide%' then 'landslide' when lower(c.code) like 'electrical%' then 'electrical' else 'other' end),
    'status',r.status,'lat',extensions.st_y(r.location::extensions.geometry),'lng',extensions.st_x(r.location::extensions.geometry),
    'landmark',r.landmark,'affected',r.people_affected,'danger',r.people_in_danger,'anonymous',r.hide_name,
    'createdAt',r.submitted_at,'updatedAt',r.updated_at,'paths',coalesce((select jsonb_agg(i.object_path order by i.uploaded_at)
      from public.report_images i where i.report_id=r.id and i.bucket_name='incident-evidence' and i.kind='REPORT'),'[]'::jsonb))
  from public.damage_reports r join public.profiles p on p.id=r.reporter_id left join public.damage_categories c on c.id=r.category_id where r.barangay_id=public.official_reporting_area()
  order by r.submitted_at desc;
$$;

commit;
