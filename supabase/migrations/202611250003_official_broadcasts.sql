begin;
create table public.official_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 3000),
  published_at timestamptz not null default now(),
  author_id uuid not null references public.profiles(id)
);
alter table public.official_broadcasts enable row level security;
revoke all on public.official_broadcasts from public, anon, authenticated;
grant select(id,title,body,published_at) on public.official_broadcasts to authenticated;
create policy signed_in_broadcast_feed on public.official_broadcasts for select to authenticated using (true);
create function public.publish_official_broadcast(headline text, message text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists (select 1 from public.profiles where id=auth.uid() and role='OFFICIAL' and account_status='ACTIVE') then
    raise exception 'An active official account is required.';
  end if;
  insert into public.official_broadcasts(title,body,author_id) values(trim(headline),trim(message),auth.uid());
end;
$$;
revoke all on function public.publish_official_broadcast(text,text) from public, anon;
grant execute on function public.publish_official_broadcast(text,text) to authenticated;
commit;
