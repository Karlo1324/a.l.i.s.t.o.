begin;

create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  phone text not null check (phone ~ '^[0-9+ ()-]+$'),
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.emergency_contacts enable row level security;
revoke all on public.emergency_contacts from public, anon, authenticated;
grant select (id, name, phone, city) on public.emergency_contacts to anon, authenticated;
create policy active_emergency_contacts_are_readable on public.emergency_contacts
  for select to anon, authenticated using (is_active);

insert into public.emergency_contacts (name, phone, city)
values ('Digos Police', '09399240779', 'Digos City')
on conflict do nothing;

commit;
