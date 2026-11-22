-- Eventos exclusivos para campeones. Inscripción autorizada en PostgreSQL por RLS.
-- Los trofeos y las recompensas visuales se derivan de los podios oficiales;
-- esta migración no modifica XP ni saldo de tienda.
create table if not exists public.sb_champion_events (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(btrim(title)) between 3 and 120),
 description text not null default '' check (char_length(description) <= 1500),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 status text not null default 'draft' check (status in ('draft','published','cancelled')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 constraint sb_champion_events_dates_check check (ends_at > starts_at)
);
create table if not exists public.sb_champion_event_entries (
 event_id uuid not null references public.sb_champion_events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key (event_id,user_id)
);
create index if not exists sb_champion_events_start_idx on public.sb_champion_events (starts_at desc);
create index if not exists sb_champion_event_entries_user_idx on public.sb_champion_event_entries (user_id);

alter table public.sb_champion_events enable row level security;
alter table public.sb_champion_event_entries enable row level security;
revoke all on public.sb_champion_events, public.sb_champion_event_entries from anon;
grant select,insert,update,delete on public.sb_champion_events to authenticated;
grant select,insert,delete on public.sb_champion_event_entries to authenticated;

create policy sb_champion_events_read on public.sb_champion_events
 for select to authenticated
 using (status='published'
   or (select auth.jwt()->'app_metadata'->>'role')='admin');
create policy sb_champion_events_admin_create on public.sb_champion_events
 for insert to authenticated
 with check ((select auth.jwt()->'app_metadata'->>'role')='admin'
   and created_by=(select auth.uid()));
create policy sb_champion_events_admin_edit on public.sb_champion_events
 for update to authenticated
 using ((select auth.jwt()->'app_metadata'->>'role')='admin')
 with check ((select auth.jwt()->'app_metadata'->>'role')='admin');
create policy sb_champion_events_admin_delete on public.sb_champion_events
 for delete to authenticated
 using ((select auth.jwt()->'app_metadata'->>'role')='admin');

create policy sb_champion_entries_read on public.sb_champion_event_entries
 for select to authenticated
 using (user_id=(select auth.uid())
  or (select auth.jwt()->'app_metadata'->>'role')='admin');
create policy sb_champion_entries_join on public.sb_champion_event_entries
 for insert to authenticated
 with check (user_id=(select auth.uid())
  and exists (select 1 from public.community_competition_awards a
    where a.user_id=(select auth.uid()) and a.place=1)
  and exists (select 1 from public.sb_champion_events ev
    where ev.id=event_id and ev.status='published' and now()<ev.ends_at));
create policy sb_champion_entries_leave on public.sb_champion_event_entries
 for delete to authenticated
 using ((user_id=(select auth.uid())
   and exists (select 1 from public.sb_champion_events ev
    where ev.id=event_id and now()<ev.ends_at))
  or (select auth.jwt()->'app_metadata'->>'role')='admin');
