begin;

-- Reconcile an existing bucket as well as one created by migration 003.
update storage.buckets
set public = false, file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'incident-evidence';

-- Restrictive policies also apply when another permissive policy grants access.
create policy alisto_evidence_create_scope on storage.objects
as restrictive for insert to anon, authenticated
with check (bucket_id <> 'incident-evidence' or
  ((storage.foldername(name))[1] = (select auth.uid())::text
   and array_length(storage.foldername(name), 1) = 2));

create policy alisto_evidence_read_scope on storage.objects
as restrictive for select to anon, authenticated
using (bucket_id <> 'incident-evidence' or
  (storage.foldername(name))[1] = (select auth.uid())::text);

create policy alisto_evidence_no_replacement on storage.objects
as restrictive for update to anon, authenticated
using (bucket_id <> 'incident-evidence')
with check (bucket_id <> 'incident-evidence');

create policy alisto_evidence_no_removal on storage.objects
as restrictive for delete to anon, authenticated
using (bucket_id <> 'incident-evidence');

-- Keep bucket administration outside browser roles.
create policy alisto_evidence_bucket_no_update on storage.buckets
as restrictive for update to anon, authenticated
using (id <> 'incident-evidence') with check (id <> 'incident-evidence');
create policy alisto_evidence_bucket_no_delete on storage.buckets
as restrictive for delete to anon, authenticated using (id <> 'incident-evidence');

-- Report submission runs through the authenticated security-definer function.
alter table public.report_images enable row level security;
alter table public.damage_reports enable row level security;
revoke insert, update, delete, truncate on public.report_images, public.damage_reports
from public, anon, authenticated;

commit;
