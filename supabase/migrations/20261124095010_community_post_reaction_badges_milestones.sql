
-- Insignias automáticas por participar en publicaciones ajenas.
create table public.member_community_reaction_badge_catalog (
 badge_key text primary key,
 target_posts integer not null unique check(target_posts>0),
 emoji text not null,title text not null,description text not null,
 sort_order smallint not null unique
);
insert into public.member_community_reaction_badge_catalog(badge_key,target_posts,emoji,title,description,sort_order)
values
 ('first_support',1,'💜','Primer apoyo','Reacciona a 1 publicación de otro miembro.',1),
 ('anime_spirit',5,'🌸','Espíritu anime','Reacciona a 5 publicaciones distintas.',2),
 ('community_fire',15,'🔥','Fuego comunitario','Reacciona a 15 publicaciones distintas.',3),
 ('social_star',30,'⭐','Estrella social','Reacciona a 30 publicaciones distintas.',4),
 ('reaction_legend',50,'👑','Leyenda de reacciones','Reacciona a 50 publicaciones distintas.',5);

-- No FK a posts: los logros permanecen si un autor borra su publicación.
create table public.member_community_reaction_earned_posts (
 user_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid not null,
 first_reacted_at timestamptz not null default now(),
 primary key(user_id,post_id)
);
create index member_community_reaction_earned_posts_latest_idx
 on public.member_community_reaction_earned_posts(user_id,first_reacted_at desc);
create table public.member_community_reaction_badges (
 user_id uuid not null references auth.users(id) on delete cascade,
 badge_key text not null references public.member_community_reaction_badge_catalog(badge_key),
 unlocked_at timestamptz not null default now(),
 primary key(user_id,badge_key)
);
create index member_community_reaction_badges_user_newest_idx
 on public.member_community_reaction_badges(user_id,unlocked_at desc);
alter table public.member_community_reaction_badge_catalog enable row level security;
alter table public.member_community_reaction_earned_posts enable row level security;
alter table public.member_community_reaction_badges enable row level security;
revoke all on public.member_community_reaction_badge_catalog from public,anon,authenticated;
revoke all on public.member_community_reaction_earned_posts from public,anon,authenticated;
revoke all on public.member_community_reaction_badges from public,anon,authenticated;
grant select on public.member_community_reaction_badge_catalog to anon,authenticated;
grant select on public.member_community_reaction_earned_posts to authenticated;
grant select on public.member_community_reaction_badges to anon,authenticated;
create policy member_community_reaction_catalog_read
 on public.member_community_reaction_badge_catalog for select to anon,authenticated using(true);
create policy member_community_reaction_earned_own
 on public.member_community_reaction_earned_posts for select to authenticated
 using(user_id=(select auth.uid()));
create policy member_community_reaction_badges_view
 on public.member_community_reaction_badges for select to anon,authenticated
 using(user_id=(select auth.uid()) or exists(
   select 1 from public.profiles p where p.id=user_id and p.is_public=true
 ));

create or replace function private.sb_award_community_reaction_badges()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare
 v_post_author uuid;
 v_count bigint;
begin
 select p.author_id into v_post_author from public.member_posts p where p.id=new.post_id;
 if v_post_author is null or v_post_author=new.user_id then return new; end if;
 -- Evita omitir hitos con reacciones simultáneas de un mismo miembro.
 perform pg_catalog.pg_advisory_xact_lock(731024,pg_catalog.hashtext(new.user_id::text));
 insert into public.member_community_reaction_earned_posts(user_id,post_id,first_reacted_at)
 values(new.user_id,new.post_id,coalesce(new.created_at,now()))
 on conflict(user_id,post_id) do nothing;
 if not found then return new; end if;
 select count(*) into v_count from public.member_community_reaction_earned_posts
 where user_id=new.user_id;
 insert into public.member_community_reaction_badges(user_id,badge_key)
 select new.user_id,c.badge_key from public.member_community_reaction_badge_catalog c
 where c.target_posts<=v_count
 on conflict(user_id,badge_key) do nothing;
 return new;
end;
$fn$;
revoke all on function private.sb_award_community_reaction_badges() from public,anon,authenticated;
create trigger sb_community_badges_from_likes
 after insert on public.member_likes for each row
 execute function private.sb_award_community_reaction_badges();
create trigger sb_community_badges_from_anime
 after insert on public.member_post_anime_reactions for each row
 execute function private.sb_award_community_reaction_badges();

-- Importar la participación anterior, sin duplicar Me gusta + emoji anime.
insert into public.member_community_reaction_earned_posts(user_id,post_id,first_reacted_at)
select prior.user_id,prior.post_id,min(prior.created_at) as first_reacted_at
from (
 select l.user_id,l.post_id,l.created_at from public.member_likes l
 union all
 select r.user_id,r.post_id,r.created_at from public.member_post_anime_reactions r
) prior
join public.member_posts p on p.id=prior.post_id
where p.author_id<>prior.user_id
group by prior.user_id,prior.post_id
on conflict(user_id,post_id) do nothing;
insert into public.member_community_reaction_badges(user_id,badge_key)
select earned.user_id,c.badge_key
from (select user_id,count(*) as total
      from public.member_community_reaction_earned_posts group by user_id) earned
join public.member_community_reaction_badge_catalog c on c.target_posts<=earned.total
on conflict(user_id,badge_key) do nothing;
