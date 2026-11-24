-- Recomendaciones de anime enviadas por miembros que sigues.
create table public.sb_member_anime_recommendations (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 anime_title text not null check (char_length(btrim(anime_title)) between 1 and 120),
 message text not null default '' check (char_length(message) <= 300),
 created_at timestamptz not null default now(),
 constraint sb_anime_recommend_not_self check(sender_id <> recipient_id)
);
create index on public.sb_member_anime_recommendations(recipient_id,created_at desc);
create index on public.sb_member_anime_recommendations(sender_id,created_at desc);
alter table public.sb_member_anime_recommendations enable row level security;
revoke all on public.sb_member_anime_recommendations from public,anon;
grant select,insert,delete on public.sb_member_anime_recommendations to authenticated;
create policy sb_anime_rec_participant_select on public.sb_member_anime_recommendations
 for select to authenticated using ((select auth.uid()) in (sender_id,recipient_id));
create policy sb_anime_rec_followed_member_insert on public.sb_member_anime_recommendations
 for insert to authenticated with check (
 sender_id=(select auth.uid()) and recipient_id <> sender_id
 and exists(select 1 from public.member_follows f where f.follower_id=sender_id and f.following_id=recipient_id)
 and exists(select 1 from public.profiles p where p.id=recipient_id and p.is_public=true)
);
create policy sb_anime_rec_participant_delete on public.sb_member_anime_recommendations
 for delete to authenticated using ((select auth.uid()) in (sender_id,recipient_id));

-- Invitaciones de retos gaming entre personas seguidas. Las sesiones no se publican.
create table public.sb_friend_gaming_challenges (
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references auth.users(id) on delete cascade,
 invited_id uuid not null references auth.users(id) on delete cascade,
 game_title text not null check (char_length(btrim(game_title)) between 1 and 120),
 target_minutes integer not null default 180 check(target_minutes between 30 and 2400 and target_minutes % 30 = 0),
 starts_on date not null default current_date,
 ends_on date not null default (current_date + 7),
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint sb_friend_challenge_not_self check(creator_id <> invited_id),
 constraint sb_friend_challenge_dates check(ends_on >= starts_on and ends_on <= starts_on + 30)
);
create index on public.sb_friend_gaming_challenges(creator_id,created_at desc);
create index on public.sb_friend_gaming_challenges(invited_id,created_at desc);
alter table public.sb_friend_gaming_challenges enable row level security;
revoke all on public.sb_friend_gaming_challenges from public,anon;
grant select,insert,update on public.sb_friend_gaming_challenges to authenticated;
create policy sb_friend_challenge_members_select on public.sb_friend_gaming_challenges
 for select to authenticated using ((select auth.uid()) in (creator_id,invited_id));
create policy sb_friend_challenge_followed_insert on public.sb_friend_gaming_challenges
 for insert to authenticated with check (
 creator_id=(select auth.uid()) and status='pending'
 and starts_on >= current_date
 and invited_id<>creator_id
 and exists(select 1 from public.member_follows f where f.follower_id=creator_id and f.following_id=invited_id)
 and exists(select 1 from public.profiles p where p.id=invited_id and p.is_public)
);
create policy sb_friend_challenge_members_update on public.sb_friend_gaming_challenges
 for update to authenticated using ((select auth.uid()) in (creator_id,invited_id))
 with check ((select auth.uid()) in (creator_id,invited_id));

-- Solo se permite cambiar el estado; un invitado acepta/rechaza, el creador cancela.
create function public.sb_friend_challenge_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare actor uuid := (select auth.uid());
begin
 if actor is null or
    new.id is distinct from old.id or
    new.creator_id is distinct from old.creator_id or
    new.invited_id is distinct from old.invited_id or
    new.game_title is distinct from old.game_title or
    new.target_minutes is distinct from old.target_minutes or
    new.starts_on is distinct from old.starts_on or
    new.ends_on is distinct from old.ends_on or
    new.created_at is distinct from old.created_at then
   raise exception 'No se pueden modificar los datos del reto';
 end if;
 if not (
  (actor=old.invited_id and old.status='pending' and new.status in ('accepted','declined'))
  or
  (actor=old.creator_id and old.status in ('pending','accepted') and new.status='cancelled')
 ) then raise exception 'Cambio de estado no permitido'; end if;
 new.updated_at=now();
 return new;
end $$;
revoke all on function public.sb_friend_challenge_guard() from public,anon;
create trigger sb_friend_challenge_guard_update before update
 on public.sb_friend_gaming_challenges for each row execute function public.sb_friend_challenge_guard();

-- Vista de tendencias: sólo posts de perfiles públicos y agregados visibles.
create view public.sb_community_post_trends with (security_invoker=true) as
 select p.id as post_id,p.created_at,p.gallery_category,p.post_tags,
 p.author_id,
 (select count(*) from public.member_likes l where l.post_id=p.id)::integer as likes_count,
 (select count(*) from public.member_comments c where c.post_id=p.id)::integer as comments_count
 from public.member_posts p
 join public.profiles pr on pr.id=p.author_id and pr.is_public=true
 where p.created_at >= now() - interval '14 days';
revoke all on public.sb_community_post_trends from public,anon;
grant select on public.sb_community_post_trends to authenticated;
