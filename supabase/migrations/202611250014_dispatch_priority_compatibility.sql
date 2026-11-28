begin;

alter table public.damage_reports
  add column if not exists dispatch_priority text
    check (dispatch_priority is null or dispatch_priority in ('critical', 'high', 'medium', 'low'));

update public.damage_reports
set dispatch_priority = case upper(priority::text)
  when 'CRITICAL' then 'critical'
  when 'HIGH' then 'high'
  when 'MEDIUM' then 'medium'
  when 'LOW' then 'low'
  else null
end
where dispatch_priority is null;

create or replace function public.official_reports()
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'reporter', jsonb_build_object('id', p.id, 'name', p.full_name, 'phone', coalesce(p.phone, ''), 'verified', false),
    'id', r.id,
    'code', r.report_no,
    'title', r.title,
    'description', r.description,
    'category', coalesce(r.app_category, case
      when lower(c.code) like 'flood%' then 'flooding'
      when lower(c.code) like 'road%' then 'road'
      when lower(c.code) like 'building%' then 'building'
      when lower(c.code) like 'fallen%' then 'tree'
      when lower(c.code) like 'landslide%' then 'landslide'
      when lower(c.code) like 'electrical%' then 'electrical'
      else 'other'
    end),
    'status', r.workflow_status,
    'lat', extensions.st_y(r.location::extensions.geometry),
    'lng', extensions.st_x(r.location::extensions.geometry),
    'landmark', r.landmark,
    'affected', r.people_affected,
    'danger', r.people_in_danger,
    'anonymous', r.hide_name,
    'createdAt', r.submitted_at,
    'updatedAt', r.updated_at,
    'assignee', r.assignee_id,
    'assigneeName', assigned.full_name,
    'assigneePhone', assigned.phone,
    'assignedAt', r.assigned_at,
    'priority', coalesce(r.dispatch_priority, case upper(r.priority::text)
      when 'CRITICAL' then 'critical'
      when 'HIGH' then 'high'
      when 'MEDIUM' then 'medium'
      when 'LOW' then 'low'
      else null
    end),
    'acceptanceStatus', r.acceptance_status,
    'acceptedAt', r.accepted_at,
    'dispatchNotes', r.dispatch_notes,
    'progress', r.task_progress,
    'checklist', r.task_checklist,
    'rejectReason', r.rejection_reason,
    'paths', coalesce((
      select jsonb_agg(i.object_path order by i.uploaded_at)
      from public.report_images i
      where i.report_id = r.id and i.bucket_name = 'incident-evidence' and i.kind = 'REPORT'
    ), '[]'::jsonb)
  )
  from public.damage_reports r
  join public.profiles p on p.id = r.reporter_id
  left join public.damage_categories c on c.id = r.category_id
  left join public.profiles assigned on assigned.id = r.assignee_id
  where r.barangay_id = public.official_reporting_area()
  order by r.submitted_at desc;
$$;

create function public.staff_assign_report(
  p_report_id uuid,
  p_assignee_id uuid,
  p_priority text,
  p_dispatch_notes text,
  p_checklist jsonb
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  actor_role text;
  report_area uuid;
  current_status text;
begin
  select p.role into actor_role
  from public.profiles p
  where p.id = auth.uid() and p.account_status = 'ACTIVE';

  if actor_role is null or actor_role not in ('ADMIN', 'OFFICIAL') then
    raise exception 'Active staff access is required.';
  end if;

  select r.barangay_id, r.workflow_status
  into report_area, current_status
  from public.damage_reports r
  where r.id = p_report_id and r.barangay_id = public.official_reporting_area()
  for update;

  if not found then raise exception 'Report was not found in your reporting area.'; end if;
  if current_status not in ('verified', 'assigned', 'progress') then raise exception 'Verify the report before dispatching it.'; end if;
  if p_assignee_id is null then raise exception 'Choose a responder.'; end if;
  if p_priority is null or p_priority not in ('critical', 'high', 'medium', 'low') then raise exception 'Choose a valid priority.'; end if;
  if p_checklist is null or jsonb_typeof(p_checklist) <> 'array' then raise exception 'A task checklist is required.'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_assignee_id and p.role = 'OFFICIAL'
      and p.account_status = 'ACTIVE' and p.barangay_id = report_area
  ) then raise exception 'Choose an active responder assigned to this barangay.'; end if;

  update public.damage_reports
  set workflow_status = 'assigned',
      assignee_id = p_assignee_id,
      assigned_at = now(),
      dispatch_priority = p_priority,
      dispatch_notes = nullif(trim(p_dispatch_notes), ''),
      acceptance_status = 'pending',
      accepted_at = null,
      task_progress = 0,
      task_checklist = p_checklist,
      updated_at = now()
  where id = p_report_id;
end;
$$;

alter function public.staff_update_report(uuid, text, text, uuid, text, text, jsonb)
  rename to staff_update_report_legacy;
revoke all on function public.staff_update_report_legacy(uuid, text, text, uuid, text, text, jsonb)
  from public, anon, authenticated;

create function public.staff_update_report(
  p_report_id uuid,
  p_action text,
  p_rejection_reason text default null,
  p_assignee_id uuid default null,
  p_priority text default null,
  p_dispatch_notes text default null,
  p_checklist jsonb default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_action = 'assign' then
    perform public.staff_assign_report(p_report_id, p_assignee_id, p_priority, p_dispatch_notes, p_checklist);
  else
    perform public.staff_update_report_legacy(
      p_report_id, p_action, p_rejection_reason, p_assignee_id, p_priority, p_dispatch_notes, p_checklist
    );
  end if;
end;
$$;

revoke all on function public.staff_assign_report(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.staff_update_report(uuid, text, text, uuid, text, text, jsonb) from public, anon;
grant execute on function public.staff_update_report(uuid, text, text, uuid, text, text, jsonb) to authenticated;
revoke all on function public.official_reports() from public, anon;
grant execute on function public.official_reports() to authenticated;

commit;
