begin;

create table public.resident_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind = 'status'),
  title text not null,
  body text not null,
  report_id uuid references public.damage_reports(id) on delete set null,
  status text not null check (status in ('verified', 'rejected')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index resident_notifications_profile_created_idx
  on public.resident_notifications (profile_id, created_at desc);

alter table public.resident_notifications enable row level security;
revoke all on public.resident_notifications from public, anon, authenticated;

create function public.notify_resident_report_decision()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.workflow_status is distinct from old.workflow_status
    and new.workflow_status in ('verified', 'rejected') then
    insert into public.resident_notifications (profile_id, kind, title, body, report_id, status)
    select p.id,
      'status',
      case new.workflow_status
        when 'verified' then 'Report accepted'
        else 'Report not accepted'
      end,
      case new.workflow_status
        when 'verified' then 'Your report ' || new.report_no || ' was accepted by barangay staff and is eligible for dispatch.'
        else 'Your report ' || new.report_no || ' was not accepted. Reason: ' || coalesce(new.rejection_reason, 'The report could not be validated.')
      end,
      new.id,
      new.workflow_status
    from public.profiles p
    where p.id = new.reporter_id
      and p.role = 'RESIDENT'
      and p.account_status = 'ACTIVE';
  end if;
  return new;
end;
$$;

create trigger resident_report_decision_notification
after update of workflow_status on public.damage_reports
for each row execute function public.notify_resident_report_decision();

create function public.my_resident_notifications()
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', n.id,
    'kind', n.kind,
    'title', n.title,
    'body', n.body,
    'incidentId', n.report_id,
    'status', n.status,
    'read', n.read_at is not null,
    'createdAt', n.created_at
  )
  from public.resident_notifications n
  join public.profiles p on p.id = n.profile_id
  where n.profile_id = auth.uid()
    and p.role = 'RESIDENT'
    and p.account_status = 'ACTIVE'
  order by n.created_at desc
  limit 100;
$$;

create function public.mark_my_resident_notifications_read(p_notification_id uuid default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  active_resident boolean;
begin
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'RESIDENT' and p.account_status = 'ACTIVE'
  ) into active_resident;

  if not active_resident then
    raise exception 'An active resident account is required.';
  end if;

  if p_notification_id is null then
    update public.resident_notifications
    set read_at = coalesce(read_at, now())
    where profile_id = auth.uid() and read_at is null;
  else
    update public.resident_notifications
    set read_at = coalesce(read_at, now())
    where id = p_notification_id and profile_id = auth.uid();
    if not found then raise exception 'Notification was not found.'; end if;
  end if;
end;
$$;

revoke all on function public.my_resident_notifications() from public, anon;
grant execute on function public.my_resident_notifications() to authenticated;
revoke all on function public.mark_my_resident_notifications_read(uuid) from public, anon;
grant execute on function public.mark_my_resident_notifications_read(uuid) to authenticated;

commit;
