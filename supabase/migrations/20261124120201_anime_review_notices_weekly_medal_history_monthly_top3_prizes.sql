-- 1. Avisos de reseñas anime en el centro de notificaciones existente.
alter table public.member_notifications
 add column anime_review_id uuid references public.sb_member_anime_reviews(id) on delete cascade,
 add column anime_comment_id uuid references public.sb_member_anime_review_comments(id) on delete cascade;

alter table public.member_notifications drop constraint member_notifications_kind_check;
alter table public.member_notifications add constraint member_notifications_kind_check check (
 kind in (
  'follow','like','comment','gift','game_like','game_comment','game_reply',
  'profile_view','poll','poll_reminder','poll_season_prize','poll_trophy_like',
  'poll_museum_prize','news_reply','tournament_full','tournament_match',
  'tournament_finished','mention','moderation_warning','moderation_suspend',
  'moderation_ban','moderation_lift','competition_published','competition_start',
  'competition_mission_reminder','competition_medal','exclusive_tag_unlock',
  'info_reaction','anime_review_comment','anime_review_reply'
 )
);
alter table public.member_notifications add constraint sb_anime_review_notification_reference
check(kind not in ('anime_review_comment','anime_review_reply') or
 (anime_review_id is not null and anime_comment_id is not null and recipient_id<>actor_id));
create unique index sb_anime_review_notifications_once
 on public.member_notifications(recipient_id,kind,anime_comment_id)
 where anime_comment_id is not null and kind in ('anime_review_comment','anime_review_reply');

create function public.sb_notify_anime_review_discussion()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 owner_id uuid;
 parent_author uuid;
begin
 select r.author_id into owner_id
 from public.sb_member_anime_reviews r where r.id=new.review_id;
 if owner_id is not null and owner_id<>new.author_id then
  insert into public.member_notifications
   (recipient_id,actor_id,kind,anime_review_id,anime_comment_id)
  values(owner_id,new.author_id,'anime_review_comment',new.review_id,new.id)
  on conflict do nothing;
 end if;
 if new.parent_id is not null then
  select c.author_id into parent_author
  from public.sb_member_anime_review_comments c where c.id=new.parent_id;
  if parent_author is not null and parent_author<>new.author_id
     and parent_author is distinct from owner_id then
   insert into public.member_notifications
    (recipient_id,actor_id,kind,anime_review_id,anime_comment_id)
   values(parent_author,new.author_id,'anime_review_reply',new.review_id,new.id)
   on conflict do nothing;
  end if;
 end if;
 return new;
end $$;
revoke all on function public.sb_notify_anime_review_discussion() from public,anon,authenticated;
create trigger sb_notify_anime_review_discussion_insert
 after insert on public.sb_member_anime_review_comments
 for each row execute function public.sb_notify_anime_review_discussion();

-- 2. Historial permanente de medallas para semanas cerradas.
create table public.sb_friend_weekly_medal_history (
 challenge_id uuid not null references public.sb_friend_gaming_challenges(id) on delete cascade,
 week_start date not null,
 creator_id uuid not null references auth.users(id) on delete cascade,
 invited_id uuid not null references auth.users(id) on delete cascade,
 winner_id uuid references auth.users(id) on delete cascade,
 is_tie boolean not null default false,
 creator_minutes integer not null check(creator_minutes>=0),
 invited_minutes integer not null check(invited_minutes>=0),
 awarded_at timestamptz not null default now(),
 primary key(challenge_id,week_start),
 constraint sb_friend_medal_winner_or_tie check (
  (winner_id is null and is_tie) or
  (winner_id in (creator_id,invited_id) and not is_tie)
 )
);
create index sb_friend_weekly_medal_history_recent_idx
 on public.sb_friend_weekly_medal_history(week_start desc,awarded_at desc);
create index sb_friend_weekly_medal_history_winners_idx
 on public.sb_friend_weekly_medal_history(winner_id,week_start desc);
alter table public.sb_friend_weekly_medal_history enable row level security;
revoke all on public.sb_friend_weekly_medal_history from public,anon;
grant select on public.sb_friend_weekly_medal_history to authenticated;
create policy sb_friend_medal_history_participants_read on public.sb_friend_weekly_medal_history
 for select to authenticated using(
  (select auth.uid()) in (creator_id,invited_id)
  and exists(
   select 1 from public.sb_friend_gaming_challenges ch
    where ch.id=challenge_id and ch.status='accepted'
  )
 );

-- Al sincronizar el segundo participante, se concede UNA sola medalla.
-- Sólo se premian semanas finalizadas con actividad de algún jugador.
create function public.sb_record_finished_friend_medal()
returns trigger language plpgsql security definer set search_path='' as $$
declare ch record;
        creator_time integer;
        invited_time integer;
begin
 if new.week_start+6>=current_date then return new; end if;
 select id,creator_id,invited_id,starts_on,ends_on,status
  into ch from public.sb_friend_gaming_challenges
  where id=new.challenge_id and status='accepted';
 if not found or ch.starts_on>new.week_start+6 or ch.ends_on<new.week_start then
  return new;
 end if;
 select a.minutes_played,b.minutes_played into creator_time,invited_time
 from public.sb_friend_gaming_weekly_progress a
 join public.sb_friend_gaming_weekly_progress b
  on b.challenge_id=a.challenge_id and b.week_start=a.week_start
 where a.challenge_id=ch.id and a.week_start=new.week_start
  and a.user_id=ch.creator_id and b.user_id=ch.invited_id;
 if creator_time is null or invited_time is null
    or (creator_time=0 and invited_time=0) then return new; end if;
 insert into public.sb_friend_weekly_medal_history
   (challenge_id,week_start,creator_id,invited_id,winner_id,is_tie,creator_minutes,invited_minutes)
 values(ch.id,new.week_start,ch.creator_id,ch.invited_id,
   case when creator_time>invited_time then ch.creator_id
        when invited_time>creator_time then ch.invited_id else null end,
   creator_time=invited_time,creator_time,invited_time)
 on conflict(challenge_id,week_start) do nothing;
 return new;
end $$;
revoke all on function public.sb_record_finished_friend_medal() from public,anon,authenticated;
create trigger sb_record_finished_friend_medal_upsert
 after insert or update of minutes_played on public.sb_friend_gaming_weekly_progress
 for each row execute function public.sb_record_finished_friend_medal();

-- Conservar medallas ya computables de semanas anteriores.
insert into public.sb_friend_weekly_medal_history
 (challenge_id,week_start,creator_id,invited_id,winner_id,is_tie,creator_minutes,invited_minutes)
select challenge_id,week_start,creator_id,invited_id,winner_id,is_tie,creator_minutes,invited_minutes
from public.sb_friend_weekly_challenge_medals
where winner_id is not null or is_tie
on conflict(challenge_id,week_start) do nothing;

-- 3. Premios cosméticos mensuales oficiales para el podio.
create table public.sb_monthly_community_prize_seasons(
 month_start date primary key,
 finalized_at timestamptz not null default now()
);
alter table public.sb_monthly_community_prize_seasons enable row level security;
revoke all on public.sb_monthly_community_prize_seasons from public,anon;
grant select on public.sb_monthly_community_prize_seasons to authenticated;
create policy sb_monthly_seasons_read on public.sb_monthly_community_prize_seasons
 for select to authenticated using(true);

create table public.sb_monthly_community_post_prizes(
 month_start date not null references public.sb_monthly_community_prize_seasons(month_start) on delete cascade,
 place smallint not null check(place between 1 and 3),
 post_id uuid not null references public.member_posts(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 likes_count integer not null default 0 check(likes_count>=0),
 comments_count integer not null default 0 check(comments_count>=0),
 score integer not null check(score>0),
 awarded_at timestamptz not null default now(),
 primary key(month_start,place),
 unique(month_start,post_id)
);
create index sb_monthly_community_prize_author_idx
 on public.sb_monthly_community_post_prizes(author_id,month_start desc);
alter table public.sb_monthly_community_post_prizes enable row level security;
revoke all on public.sb_monthly_community_post_prizes from public,anon;
grant select on public.sb_monthly_community_post_prizes to authenticated;
create policy sb_monthly_prizes_public_read on public.sb_monthly_community_post_prizes
 for select to authenticated using(
 author_id=(select auth.uid()) or
 exists(select 1 from public.profiles p where p.id=author_id and p.is_public=true)
);

-- Cualquiera con sesión puede SOLICITAR la finalización, pero la elección
-- la calcula el servidor de una única vez para el mes terminado.
create function public.sb_finalize_previous_community_month()
returns integer language plpgsql security definer set search_path='' as $$
declare previous_month date := (date_trunc('month',now() at time zone 'Europe/Madrid')-interval '1 month')::date;
        did_insert integer := 0;
        total integer := 0;
begin
 if (select auth.uid()) is null then raise exception 'Inicia sesión'; end if;
 insert into public.sb_monthly_community_prize_seasons(month_start)
 values(previous_month) on conflict do nothing;
 get diagnostics did_insert=row_count;
 if did_insert=1 then
  with scored as (
   select p.id as post_id,p.author_id,p.created_at,
    (select count(*) from public.member_likes l where l.post_id=p.id)::int as likes_count,
    (select count(*) from public.member_comments c where c.post_id=p.id)::int as comments_count
   from public.member_posts p
    join public.profiles pr on pr.id=p.author_id and pr.is_public=true
   where p.created_at at time zone 'Europe/Madrid' >= previous_month::timestamp
     and p.created_at at time zone 'Europe/Madrid' < (previous_month+interval '1 month')::timestamp
  ), scores as (
   select *, (3*likes_count+2*comments_count)::int as score from scored
  ), ranked as (
   select *,row_number() over(order by score desc,likes_count desc,
                      created_at desc,post_id) as position from scores where score>0
  )
  insert into public.sb_monthly_community_post_prizes
   (month_start,place,post_id,author_id,likes_count,comments_count,score)
  select previous_month,position::smallint,post_id,author_id,likes_count,comments_count,score
  from ranked where position<=3;
 end if;
 select count(*) into total from public.sb_monthly_community_post_prizes
   where month_start=previous_month;
 return total;
end $$;
revoke all on function public.sb_finalize_previous_community_month() from public,anon;
grant execute on function public.sb_finalize_previous_community_month() to authenticated;
