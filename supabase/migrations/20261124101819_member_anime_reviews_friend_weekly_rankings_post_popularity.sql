-- Valoraciones y reseñas publicadas voluntariamente por su autor.
-- La lista personal de anime se mantiene privada.
create table public.sb_member_anime_reviews (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 anime_title text not null check(char_length(btrim(anime_title)) between 1 and 120),
 rating smallint not null check(rating between 1 and 5),
 review text not null default '' check(char_length(review)<=1000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index sb_member_anime_reviews_author_title_uniq
 on public.sb_member_anime_reviews(author_id,lower(btrim(anime_title)));
create index sb_member_anime_reviews_recent_idx on public.sb_member_anime_reviews(created_at desc);
alter table public.sb_member_anime_reviews enable row level security;
revoke all on public.sb_member_anime_reviews from public,anon;
grant select,insert,update,delete on public.sb_member_anime_reviews to authenticated;
create policy sb_anime_reviews_public_read on public.sb_member_anime_reviews
 for select to authenticated using (
 author_id=(select auth.uid()) or exists(
 select 1 from public.profiles p where p.id=author_id and p.is_public=true)
 );
create policy sb_anime_reviews_author_insert on public.sb_member_anime_reviews
 for insert to authenticated with check (author_id=(select auth.uid()));
create policy sb_anime_reviews_author_update on public.sb_member_anime_reviews
 for update to authenticated using (author_id=(select auth.uid()))
 with check(author_id=(select auth.uid()));
create policy sb_anime_reviews_author_delete on public.sb_member_anime_reviews
 for delete to authenticated using(author_id=(select auth.uid()));

-- Solo se muestran los minutos semanales agregados de retos aceptados.
create table public.sb_friend_gaming_weekly_progress (
 challenge_id uuid not null references public.sb_friend_gaming_challenges(id) on delete cascade,
 week_start date not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 minutes_played integer not null default 0 check(minutes_played between 0 and 1000000),
 updated_at timestamptz not null default now(),
 primary key(challenge_id,week_start,user_id)
);
create index sb_friend_gaming_weekly_progress_week_idx
 on public.sb_friend_gaming_weekly_progress(week_start);
alter table public.sb_friend_gaming_weekly_progress enable row level security;
revoke all on public.sb_friend_gaming_weekly_progress from public,anon;
grant select on public.sb_friend_gaming_weekly_progress to authenticated;
create policy sb_friend_week_progress_participants_read on public.sb_friend_gaming_weekly_progress
 for select to authenticated using (
 exists(
  select 1 from public.sb_friend_gaming_challenges ch
  where ch.id=challenge_id and ch.status='accepted'
  and (select auth.uid()) in (ch.creator_id,ch.invited_id)
 )
);

-- La función calcula únicamente los minutos del usuario que la invoca.
create function public.sb_sync_friend_gaming_weekly_progress(challenge_key uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare
 actor uuid := (select auth.uid());
 ch record;
 monday date := current_date - (extract(isodow from current_date)::int - 1);
 tally bigint;
begin
 if actor is null then raise exception 'Debes iniciar sesión'; end if;
 select id,creator_id,invited_id,game_title,starts_on,ends_on
 into ch from public.sb_friend_gaming_challenges
 where id=challenge_key and status='accepted'
 and actor in (creator_id,invited_id)
 and starts_on<=monday+6 and ends_on>=monday;
 if not found then raise exception 'Reto no autorizado o fuera de esta semana'; end if;
 select coalesce(sum(s.minutes_played),0)::bigint into tally
 from public.member_gaming_sessions s
 where s.user_id=actor
 and lower(btrim(s.game_title))=lower(btrim(ch.game_title))
 and s.played_on between greatest(ch.starts_on,monday) and least(ch.ends_on,monday+6);
 insert into public.sb_friend_gaming_weekly_progress
  (challenge_id,week_start,user_id,minutes_played,updated_at)
 values (challenge_key,monday,actor,least(tally,1000000)::int,now())
 on conflict(challenge_id,week_start,user_id)
 do update set minutes_played=excluded.minutes_played,updated_at=now();
 return least(tally,1000000)::int;
end $$;
revoke all on function public.sb_sync_friend_gaming_weekly_progress(uuid) from public,anon;
grant execute on function public.sb_sync_friend_gaming_weekly_progress(uuid) to authenticated;

-- Insignias calculadas de las publicaciones públicas sin exponer el texto.
create view public.sb_public_post_popularity
with (security_invoker=true)
as
select p.id as post_id,p.author_id,p.created_at,
 (select count(*) from public.member_likes l where l.post_id=p.id)::int as likes_count,
 (select count(*) from public.member_comments c where c.post_id=p.id)::int as comments_count
from public.member_posts p
join public.profiles pr on pr.id=p.author_id and pr.is_public=true;
revoke all on public.sb_public_post_popularity from public,anon;
grant select on public.sb_public_post_popularity to authenticated;
