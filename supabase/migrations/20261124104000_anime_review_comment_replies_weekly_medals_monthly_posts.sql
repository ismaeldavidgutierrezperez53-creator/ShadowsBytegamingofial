-- Respuestas a reseñas publicadas voluntariamente.
create table public.sb_member_anime_review_comments (
 id uuid primary key default gen_random_uuid(),
 review_id uuid not null references public.sb_member_anime_reviews(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 parent_id uuid references public.sb_member_anime_review_comments(id) on delete cascade,
 content text not null check(char_length(btrim(content)) between 1 and 800),
 created_at timestamptz not null default now(),
 constraint sb_anime_review_comment_not_self check(parent_id is null or parent_id<>id)
);
create index sb_anime_review_comments_recent_idx
 on public.sb_member_anime_review_comments(review_id,created_at,id);
create index sb_anime_review_comments_parent_idx
 on public.sb_member_anime_review_comments(parent_id) where parent_id is not null;
alter table public.sb_member_anime_review_comments enable row level security;
revoke all on public.sb_member_anime_review_comments from public,anon;
grant select,insert,delete on public.sb_member_anime_review_comments to authenticated;

create policy sb_anime_review_comments_read on public.sb_member_anime_review_comments
 for select to authenticated using (
  exists(select 1 from public.sb_member_anime_reviews r where r.id=review_id)
 );
create policy sb_anime_review_comments_write on public.sb_member_anime_review_comments
 for insert to authenticated with check (
  author_id=(select auth.uid())
  and exists(select 1 from public.sb_member_anime_reviews r where r.id=review_id)
 );
create policy sb_anime_review_comments_delete on public.sb_member_anime_review_comments
 for delete to authenticated using(author_id=(select auth.uid()));

-- Impide responder a otra reseña y limita a un nivel de respuestas.
create function public.sb_anime_review_comment_guard_parent()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare existing_review uuid;
declare existing_parent uuid;
begin
 if new.parent_id is null then return new; end if;
 select c.review_id,c.parent_id into existing_review,existing_parent
 from public.sb_member_anime_review_comments c where c.id=new.parent_id;
 if existing_review is null
    or existing_review<>new.review_id
    or existing_parent is not null then
  raise exception 'Solo puedes responder a comentarios de esta reseña';
 end if;
 return new;
end $$;
revoke all on function public.sb_anime_review_comment_guard_parent() from public,anon;
create trigger sb_anime_review_comment_guard_parent_insert
before insert on public.sb_member_anime_review_comments
for each row execute function public.sb_anime_review_comment_guard_parent();

-- Medallas de retos terminados: sólo se calculan cuando ambos participantes
-- han sincronizado su progreso para esa semana.
create view public.sb_friend_weekly_challenge_medals with (security_invoker=true) as
select ch.id as challenge_id,
       a.week_start,
       ch.game_title,
       ch.creator_id,
       ch.invited_id,
       a.minutes_played as creator_minutes,
       b.minutes_played as invited_minutes,
       case when a.minutes_played>b.minutes_played then ch.creator_id
            when b.minutes_played>a.minutes_played then ch.invited_id
            else null::uuid end as winner_id,
       case when a.minutes_played=b.minutes_played and a.minutes_played>0
            then true else false end as is_tie
from public.sb_friend_gaming_challenges ch
join public.sb_friend_gaming_weekly_progress a
 on a.challenge_id=ch.id and a.user_id=ch.creator_id
join public.sb_friend_gaming_weekly_progress b
 on b.challenge_id=ch.id and b.user_id=ch.invited_id
 and b.week_start=a.week_start
where ch.status='accepted'
  and a.week_start+6<current_date
  and ch.starts_on<=a.week_start+6
  and ch.ends_on>=a.week_start
  and a.week_start >= current_date-interval '91 days';
revoke all on public.sb_friend_weekly_challenge_medals from public,anon;
grant select on public.sb_friend_weekly_challenge_medals to authenticated;

-- Finaliza los minutos propios de la semana pasada, sin exponer sesiones
-- del rival ni permitir que el navegador escriba puntuaciones arbitrarias.
create function public.sb_sync_friend_previous_week_progress(challenge_key uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare
 actor uuid := (select auth.uid());
 this_monday date := current_date - (extract(isodow from current_date)::int-1);
 previous_monday date := this_monday-7;
 ch record;
 tally bigint;
begin
 if actor is null then raise exception 'Inicia sesión'; end if;
 select id,creator_id,invited_id,game_title,starts_on,ends_on,updated_at
 into ch from public.sb_friend_gaming_challenges
 where id=challenge_key and status='accepted'
  and actor in(creator_id,invited_id)
  and starts_on<=previous_monday+6 and ends_on>=previous_monday
  and updated_at::date <= previous_monday+6;
 if not found then raise exception 'Reto no autorizado o sin semana anterior completada'; end if;
 select coalesce(sum(s.minutes_played),0)::bigint into tally
 from public.member_gaming_sessions s
 where s.user_id=actor
  and lower(btrim(s.game_title))=lower(btrim(ch.game_title))
  and s.played_on between greatest(ch.starts_on,previous_monday)
                      and least(ch.ends_on,previous_monday+6);
 insert into public.sb_friend_gaming_weekly_progress
   (challenge_id,week_start,user_id,minutes_played,updated_at)
 values(challenge_key,previous_monday,actor,least(tally,1000000)::int,now())
 on conflict(challenge_id,week_start,user_id)
 do update set minutes_played=excluded.minutes_played,updated_at=now();
 return least(tally,1000000)::int;
end $$;
revoke all on function public.sb_sync_friend_previous_week_progress(uuid) from public,anon;
grant execute on function public.sb_sync_friend_previous_week_progress(uuid) to authenticated;

-- Ranking de publicaciones públicas del mes actual y los dos anteriores.
-- No expone textos ni spoilers; solo metadatos e interacciones.
create view public.sb_community_monthly_top_posts with (security_invoker=true) as
select p.id as post_id, p.author_id, p.created_at, p.gallery_category,
       date_trunc('month',p.created_at at time zone 'Europe/Madrid')::date as month_start,
       (select count(*) from public.member_likes l where l.post_id=p.id)::int as likes_count,
       (select count(*) from public.member_comments c where c.post_id=p.id)::int as comments_count,
       (3*(select count(*) from public.member_likes l where l.post_id=p.id)
        +2*(select count(*) from public.member_comments c where c.post_id=p.id))::int as score
from public.member_posts p
join public.profiles pr on pr.id=p.author_id and pr.is_public=true
where (p.created_at at time zone 'Europe/Madrid')
 >= date_trunc('month',now() at time zone 'Europe/Madrid')-interval '2 months';
revoke all on public.sb_community_monthly_top_posts from public,anon;
grant select on public.sb_community_monthly_top_posts to authenticated;
