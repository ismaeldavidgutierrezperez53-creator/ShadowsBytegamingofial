-- Notificaciones únicas para insignias desbloqueadas automáticamente.
-- Las actividades se validan previamente en Supabase y las escrituras del cliente están revocadas.
create table public.sb_member_auto_tag_unlocks (
 user_id uuid not null references public.profiles(id) on delete cascade,
 tag_id uuid not null references public.sb_exclusive_tag_auto_rules(tag_id) on delete cascade,
 unlocked_at timestamptz not null default now(),
 celebrated_at timestamptz,
 primary key(user_id,tag_id)
);
create index sb_auto_tag_pending_idx on public.sb_member_auto_tag_unlocks(user_id,unlocked_at)
 where celebrated_at is null;
alter table public.sb_member_auto_tag_unlocks enable row level security;
revoke all on public.sb_member_auto_tag_unlocks from public,anon,authenticated;
grant select on public.sb_member_auto_tag_unlocks to authenticated;
grant all on public.sb_member_auto_tag_unlocks to service_role;
create policy sb_auto_tag_unlock_self_read on public.sb_member_auto_tag_unlocks
 for select to authenticated using(user_id=(select auth.uid()));

alter table public.member_notifications
 add column auto_tag_id uuid references public.sb_exclusive_tag_auto_rules(tag_id) on delete set null;
alter table public.member_notifications drop constraint member_notifications_kind_check;
alter table public.member_notifications add constraint member_notifications_kind_check
check(kind in (
 'follow','like','comment','gift','game_like','game_comment','game_reply','profile_view',
 'poll','poll_reminder','poll_season_prize','poll_trophy_like','poll_museum_prize',
 'news_reply','tournament_full','tournament_match','tournament_finished','mention',
 'moderation_warning','moderation_suspend','moderation_ban','moderation_lift',
 'competition_published','competition_start','competition_mission_reminder','competition_medal',
 'exclusive_tag_unlock'
));
alter table public.member_notifications drop constraint member_notifications_check;
alter table public.member_notifications add constraint member_notifications_check
check(
 recipient_id<>actor_id
 or (kind in ('poll','poll_reminder') and poll_id is not null)
 or (kind='poll_season_prize' and season_month is not null)
 or (kind='poll_museum_prize' and museum_month is not null)
 or (kind in ('tournament_full','tournament_match','tournament_finished') and tournament_id is not null)
 or kind in ('competition_published','competition_start','competition_mission_reminder','competition_medal')
 or (kind='exclusive_tag_unlock' and auto_tag_id is not null)
);
alter table public.member_notifications add constraint sb_notification_auto_tag_ref_check
 check((kind='exclusive_tag_unlock')=(auto_tag_id is not null));
create unique index sb_auto_tag_notice_once on public.member_notifications(recipient_id,auto_tag_id)
 where kind='exclusive_tag_unlock';

-- Registrar silenciosamente logros antiguos, sin notificaciones retroactivas.
insert into public.sb_member_auto_tag_unlocks(user_id,tag_id,unlocked_at,celebrated_at)
select p.id,progress.tag_id,now(),now()
from public.profiles p
cross join lateral public.get_member_auto_exclusive_progress(array[p.id]) progress
where p.is_public=true and progress.unlocked
on conflict do nothing;

-- Solo los triggers internos llaman esta función privada.
create or replace function private.sb_sync_verified_auto_tags(p_user uuid)
returns void language plpgsql security definer set search_path='' as $fn$
begin
 if p_user is null then return; end if;
 with newly as (
  insert into public.sb_member_auto_tag_unlocks(user_id,tag_id)
  select p_user,progress.tag_id
  from public.get_member_auto_exclusive_progress(array[p_user]) progress
  where progress.member_id=p_user and progress.unlocked
  on conflict do nothing
  returning user_id,tag_id
 )
 insert into public.member_notifications(recipient_id,actor_id,kind,auto_tag_id)
 select user_id,user_id,'exclusive_tag_unlock',tag_id from newly
 on conflict do nothing;
exception when others then
 raise warning 'No se pudieron registrar etiquetas automáticas para %: %',p_user,sqlerrm;
end
$fn$;
revoke all on function private.sb_sync_verified_auto_tags(uuid) from public,anon,authenticated;
grant execute on function private.sb_sync_verified_auto_tags(uuid) to service_role;

create or replace function private.sb_auto_tag_event()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare target_user uuid;
begin
 target_user:=case when tg_table_name in ('member_posts','member_comments') then
  case when tg_table_name='member_posts' then new.author_id else new.author_id end
  else new.user_id end;
 perform private.sb_sync_verified_auto_tags(target_user);
 return new;
end $fn$;
revoke all on function private.sb_auto_tag_event() from public,anon,authenticated;
create trigger sb_auto_tag_from_posts after insert on public.member_posts
 for each row execute function private.sb_auto_tag_event();
create trigger sb_auto_tag_from_comments after insert on public.member_comments
 for each row execute function private.sb_auto_tag_event();
create trigger sb_auto_tag_from_likes after insert on public.member_likes
 for each row execute function private.sb_auto_tag_event();
create trigger sb_auto_tag_from_favorites after insert on public.member_catalog_favorites
 for each row execute function private.sb_auto_tag_event();
create trigger sb_auto_tag_from_poll_votes after insert on public.community_poll_votes
 for each row execute function private.sb_auto_tag_event();
create trigger sb_auto_tag_from_poll_awards after insert on public.member_poll_milestone_awards
 for each row execute function private.sb_auto_tag_event();
create trigger sb_auto_tag_from_season_awards after insert on public.community_poll_season_results
 for each row execute function private.sb_auto_tag_event();
create trigger sb_auto_tag_from_daily after insert on public.member_daily_rewards
 for each row execute function private.sb_auto_tag_event();
create trigger sb_auto_tag_from_missions after insert on public.member_mission_claims
 for each row execute function private.sb_auto_tag_event();
create trigger sb_auto_tag_from_chests after insert on public.member_reward_chests
 for each row execute function private.sb_auto_tag_event();
create trigger sb_auto_tag_from_shop_challenges after insert on public.member_shop_challenge_claims
 for each row execute function private.sb_auto_tag_event();
create trigger sb_auto_tag_from_point_medals after insert on public.member_point_goal_medals
 for each row execute function private.sb_auto_tag_event();

-- Reclamar celebraciones pendientes una sola vez y de forma atómica.
create or replace function public.take_my_auto_tag_celebrations()
returns table(tag_id uuid,label text,emoji text,color text,animation text,unlocked_at timestamptz)
language plpgsql security definer set search_path='' as $fn$
begin
 if (select auth.uid()) is null then
  raise exception 'Debes iniciar sesión.' using errcode='28000';
 end if;
 return query
 with claimed as (
  update public.sb_member_auto_tag_unlocks u
  set celebrated_at=now()
  where u.user_id=(select auth.uid())
   and u.celebrated_at is null
   and u.tag_id in (
    select pending.tag_id from public.sb_member_auto_tag_unlocks pending
    where pending.user_id=(select auth.uid()) and pending.celebrated_at is null
    order by pending.unlocked_at,pending.tag_id limit 4
   )
  returning u.tag_id,u.unlocked_at
 )
 select c.tag_id,cat.label,cat.emoji,cat.color,cat.animation,c.unlocked_at
 from claimed c join public.sb_exclusive_tag_catalog cat on cat.id=c.tag_id
 order by c.unlocked_at,c.tag_id;
end $fn$;
revoke all on function public.take_my_auto_tag_celebrations() from public,anon,authenticated;
grant execute on function public.take_my_auto_tag_celebrations() to authenticated,service_role;
