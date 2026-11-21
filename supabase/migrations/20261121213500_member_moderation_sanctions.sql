-- Sanciones de miembros de Shadows Byte V2 (historial y estado de acceso).
-- Las escrituras de sanciones solo se hacen desde la Edge Function autenticada.
create table if not exists public.member_moderation_events (
 id bigint generated always as identity primary key,
 target_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null check (action in ('warning','suspend','ban','lift')),
 reason text not null check (length(trim(reason)) between 6 and 500),
 expires_at timestamptz,
 created_at timestamptz not null default now(),
 constraint sanctions_suspension_expiry check (
   (action = 'suspend' and expires_at is not null)
   or (action <> 'suspend' and expires_at is null)
 )
);
create index if not exists member_moderation_events_target_date
 on public.member_moderation_events(target_id,created_at desc);
create index if not exists member_moderation_events_date
 on public.member_moderation_events(created_at desc);

create table if not exists public.member_moderation_status (
 user_id uuid primary key references auth.users(id) on delete cascade,
 action text not null check (action in ('suspend','ban')),
 reason text not null check (length(trim(reason)) between 6 and 500),
 expires_at timestamptz,
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 constraint moderation_state_expiry check (
   (action = 'suspend' and expires_at is not null)
   or (action = 'ban' and expires_at is null)
 )
);
alter table public.member_moderation_events enable row level security;
alter table public.member_moderation_status enable row level security;
revoke all on public.member_moderation_events from public,anon,authenticated;
revoke all on public.member_moderation_status from public,anon,authenticated;
grant select on public.member_moderation_events,public.member_moderation_status to authenticated;
grant select,insert,update,delete on public.member_moderation_events,public.member_moderation_status to service_role;
grant usage,select on sequence public.member_moderation_events_id_seq to service_role;

drop policy if exists sb_moderation_events_visible on public.member_moderation_events;
create policy sb_moderation_events_visible on public.member_moderation_events
 for select to authenticated using (
   target_id = (select auth.uid()) or exists (
     select 1 from public.site_staff_roles s
      where s.user_id=(select auth.uid()) and s.role in ('owner','admin','moderator')
   )
 );
drop policy if exists sb_moderation_status_visible on public.member_moderation_status;
create policy sb_moderation_status_visible on public.member_moderation_status
 for select to authenticated using (
   user_id=(select auth.uid()) or exists (
     select 1 from public.site_staff_roles s
      where s.user_id=(select auth.uid()) and s.role in ('owner','admin','moderator')
   )
 );
-- Las restricciones de escritura siguen vigentes aunque un token JWT anterior
-- a la sanción aún esté activo. Solo se comprueba la sanción del propio actor.

drop policy if exists sb_active_members_only_insert on public.member_posts;
create policy sb_active_members_only_insert on public.member_posts
 as restrictive for insert to authenticated
 with check (
   author_id = (select auth.uid()) and not exists (
     select 1 from public.member_moderation_status status
      where status.user_id = (select auth.uid())
        and (status.action = 'ban' or status.expires_at > now())
   )
 );

drop policy if exists sb_active_members_only_insert on public.member_comments;
create policy sb_active_members_only_insert on public.member_comments
 as restrictive for insert to authenticated
 with check (
   author_id = (select auth.uid()) and not exists (
     select 1 from public.member_moderation_status status
      where status.user_id = (select auth.uid())
        and (status.action = 'ban' or status.expires_at > now())
   )
 );

drop policy if exists sb_active_members_only_insert on public.member_direct_messages;
create policy sb_active_members_only_insert on public.member_direct_messages
 as restrictive for insert to authenticated
 with check (
   sender_id = (select auth.uid()) and not exists (
     select 1 from public.member_moderation_status status
      where status.user_id = (select auth.uid())
        and (status.action = 'ban' or status.expires_at > now())
   )
 );

drop policy if exists sb_active_members_only_insert on public.member_chat_group_messages;
create policy sb_active_members_only_insert on public.member_chat_group_messages
 as restrictive for insert to authenticated
 with check (
   sender_id = (select auth.uid()) and not exists (
     select 1 from public.member_moderation_status status
      where status.user_id = (select auth.uid())
        and (status.action = 'ban' or status.expires_at > now())
   )
 );

drop policy if exists sb_active_members_only_insert on public.news_comments;
create policy sb_active_members_only_insert on public.news_comments
 as restrictive for insert to authenticated
 with check (
   author_id = (select auth.uid()) and not exists (
     select 1 from public.member_moderation_status status
      where status.user_id = (select auth.uid())
        and (status.action = 'ban' or status.expires_at > now())
   )
 );

drop policy if exists sb_active_members_only_insert on public.member_likes;
create policy sb_active_members_only_insert on public.member_likes
 as restrictive for insert to authenticated
 with check (
   user_id = (select auth.uid()) and not exists (
     select 1 from public.member_moderation_status status
      where status.user_id = (select auth.uid())
        and (status.action = 'ban' or status.expires_at > now())
   )
 );

drop policy if exists sb_active_members_only_insert on public.community_poll_votes;
create policy sb_active_members_only_insert on public.community_poll_votes
 as restrictive for insert to authenticated
 with check (
   user_id = (select auth.uid()) and not exists (
     select 1 from public.member_moderation_status status
      where status.user_id = (select auth.uid())
        and (status.action = 'ban' or status.expires_at > now())
   )
 );
