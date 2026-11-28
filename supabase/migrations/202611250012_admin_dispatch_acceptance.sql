begin;

alter table public.damage_reports
  add column if not exists workflow_status text not null default 'pending'
    check (workflow_status in ('pending', 'review', 'verified', 'assigned', 'progress', 'resolved', 'rejected')),
  add column if not exists rejection_reason text,
  add column if not exists assignee_id uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists priority text check (priority is null or priority in ('critical', 'high', 'medium', 'low')),
  add column if not exists dispatch_notes text,
  add column if not exists acceptance_status text not null default 'pending'
    check (acceptance_status in ('pending', 'accepted', 'declined')),
  add column if not exists accepted_at timestamptz,
  add column if not exists task_progress integer not null default 0 check (task_progress between 0 and 100),
  add column if not exists task_checklist jsonb not null default '[]'::jsonb
    check (jsonb_typeof(task_checklist) = 'array');

update public.damage_reports
set workflow_status = case upper(status::text)
  when 'UNDER_REVIEW' then 'review'
  when 'REVIEW' then 'review'
  when 'VERIFIED' then 'verified'
  when 'ASSIGNED' then 'assigned'
  when 'IN_PROGRESS' then 'progress'
  when 'PROGRESS' then 'progress'
  when 'RESOLVED' then 'resolved'
  when 'REJECTED' then 'rejected'
  else 'pending'
end;

update public.damage_reports
set assigned_at = updated_at
where workflow_status in ('assigned', 'progress', 'resolved') and assigned_at is null;

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
    'priority', r.priority,
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

create or replace function public.my_resident_reports()
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'code', r.report_no,
    'title', r.title,
    'description', r.description,
    'category', r.app_category,
    'status', r.workflow_status,
    'rejectReason', r.rejection_reason,
    'lat', extensions.st_y(r.location::extensions.geometry),
    'lng', extensions.st_x(r.location::extensions.geometry),
    'landmark', r.landmark,
    'affected', r.people_affected,
    'danger', r.people_in_danger,
    'anonymous', r.hide_name,
    'createdAt', r.submitted_at,
    'updatedAt', r.updated_at,
    'paths', coalesce((
      select jsonb_agg(i.object_path order by i.uploaded_at)
      from public.report_images i
      where i.report_id = r.id and i.uploader_id = auth.uid() and i.kind = 'REPORT'
    ), '[]'::jsonb)
  )
  from public.damage_reports r
  where r.reporter_id = auth.uid() and r.app_category is not null
  order by r.submitted_at desc;
$$;

create function public.staff_responder_list()
returns table (id uuid, full_name text, phone text, active_tasks bigint)
language plpgsql stable security definer set search_path = ''
as $$
declare
  actor_role text;
begin
  select p.role into actor_role
  from public.profiles p
  where p.id = auth.uid() and p.account_status = 'ACTIVE';

  if actor_role is null or actor_role not in ('ADMIN', 'OFFICIAL') then
    raise exception 'Active staff access is required.';
  end if;

  return query
  select p.id, p.full_name::text, coalesce(p.phone, '')::text, count(r.id)::bigint
  from public.profiles p
  left join public.damage_reports r
    on r.assignee_id = p.id and r.workflow_status in ('assigned', 'progress')
  where p.role = 'OFFICIAL'
    and p.account_status = 'ACTIVE'
    and p.barangay_id = public.official_reporting_area()
  group by p.id, p.full_name, p.phone
  order by p.full_name;
end;
$$;

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
declare
  actor_id uuid := auth.uid();
  actor_role text;
  report_area uuid;
  current_status text;
  current_assignee uuid;
  current_acceptance text;
begin
  select p.role into actor_role
  from public.profiles p
  where p.id = actor_id and p.account_status = 'ACTIVE';

  if actor_role is null or actor_role not in ('ADMIN', 'OFFICIAL') then
    raise exception 'Active staff access is required.';
  end if;

  select r.barangay_id, r.workflow_status, r.assignee_id, r.acceptance_status
  into report_area, current_status, current_assignee, current_acceptance
  from public.damage_reports r
  where r.id = p_report_id and r.barangay_id = public.official_reporting_area()
  for update;

  if not found then
    raise exception 'Report was not found in your reporting area.';
  end if;

  if p_action = 'start_review' then
    if current_status <> 'pending' then raise exception 'Only pending reports can start review.'; end if;
    update public.damage_reports set workflow_status = 'review', updated_at = now() where id = p_report_id;
  elsif p_action = 'verify' then
    if current_status not in ('pending', 'review') then raise exception 'Only pending reports can be verified.'; end if;
    update public.damage_reports set workflow_status = 'verified', rejection_reason = null, updated_at = now() where id = p_report_id;
  elsif p_action = 'reject' then
    if current_status not in ('pending', 'review', 'verified') then raise exception 'This report can no longer be rejected.'; end if;
    if nullif(trim(p_rejection_reason), '') is null then raise exception 'A rejection reason is required.'; end if;
    update public.damage_reports
    set workflow_status = 'rejected', rejection_reason = trim(p_rejection_reason), updated_at = now()
    where id = p_report_id;
  elsif p_action = 'assign' then
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
        priority = p_priority,
        dispatch_notes = nullif(trim(p_dispatch_notes), ''),
        acceptance_status = 'pending',
        accepted_at = null,
        task_progress = 0,
        task_checklist = p_checklist,
        updated_at = now()
    where id = p_report_id;
  elsif p_action in ('accept', 'decline') then
    if actor_role <> 'OFFICIAL' or current_assignee is distinct from actor_id then raise exception 'Only the assigned responder can answer this dispatch.'; end if;
    if current_status <> 'assigned' or current_acceptance <> 'pending' then raise exception 'This dispatch is no longer awaiting a response.'; end if;
    if p_action = 'accept' then
      update public.damage_reports set acceptance_status = 'accepted', accepted_at = now(), updated_at = now() where id = p_report_id;
    else
      update public.damage_reports set acceptance_status = 'declined', accepted_at = null, updated_at = now() where id = p_report_id;
    end if;
  elsif p_action = 'start_work' then
    if actor_role <> 'OFFICIAL' or current_assignee is distinct from actor_id then raise exception 'Only the assigned responder can start this task.'; end if;
    if current_status <> 'assigned' or current_acceptance <> 'accepted' then raise exception 'Accept the dispatch before starting work.'; end if;
    update public.damage_reports set workflow_status = 'progress', task_progress = greatest(task_progress, 10), updated_at = now() where id = p_report_id;
  elsif p_action = 'resolve' then
    if actor_role <> 'OFFICIAL' or current_assignee is distinct from actor_id then raise exception 'Only the assigned responder can resolve this task.'; end if;
    if current_status <> 'progress' or current_acceptance <> 'accepted' then raise exception 'Start an accepted task before resolving it.'; end if;
    update public.damage_reports
    set workflow_status = 'resolved',
        task_progress = 100,
        task_checklist = coalesce((
          select jsonb_agg(jsonb_set(item, '{done}', 'true'::jsonb, true))
          from jsonb_array_elements(task_checklist) as checklist(item)
        ), '[]'::jsonb),
        updated_at = now()
    where id = p_report_id;
  elsif p_action = 'update_checklist' then
    if actor_role <> 'ADMIN' and (actor_role <> 'OFFICIAL' or current_assignee is distinct from actor_id) then
      raise exception 'Only the assigned responder or an administrator can update this checklist.';
    end if;
    if current_status not in ('assigned', 'progress') then raise exception 'Only active tasks have an editable checklist.'; end if;
    if p_checklist is null or jsonb_typeof(p_checklist) <> 'array' then raise exception 'A valid checklist is required.'; end if;
    update public.damage_reports
    set task_checklist = p_checklist,
        task_progress = case
          when jsonb_array_length(p_checklist) = 0 then 0
          else round(100.0 * (
            select count(*) from jsonb_array_elements(p_checklist) as checklist(item)
            where checklist.item->>'done' = 'true'
          ) / jsonb_array_length(p_checklist))::integer
        end,
        updated_at = now()
    where id = p_report_id;
  elsif p_action = 'reopen' then
    if current_status not in ('resolved', 'rejected') then raise exception 'Only resolved or rejected reports can be reopened.'; end if;
    update public.damage_reports
    set workflow_status = 'review',
        rejection_reason = null,
        assignee_id = null,
        assigned_at = null,
        priority = null,
        dispatch_notes = null,
        acceptance_status = 'pending',
        accepted_at = null,
        task_progress = 0,
        task_checklist = '[]'::jsonb,
        updated_at = now()
    where id = p_report_id;
  else
    raise exception 'Unsupported report action.';
  end if;
end;
$$;

revoke all on function public.staff_responder_list() from public, anon;
grant execute on function public.staff_responder_list() to authenticated;
revoke all on function public.staff_update_report(uuid, text, text, uuid, text, text, jsonb) from public, anon;
grant execute on function public.staff_update_report(uuid, text, text, uuid, text, text, jsonb) to authenticated;
revoke all on function public.official_reports() from public, anon;
grant execute on function public.official_reports() to authenticated;
revoke all on function public.my_resident_reports() from public, anon;
grant execute on function public.my_resident_reports() to authenticated;

commit;
