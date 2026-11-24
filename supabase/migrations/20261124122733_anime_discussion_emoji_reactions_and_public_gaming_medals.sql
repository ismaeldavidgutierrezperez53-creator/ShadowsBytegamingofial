-- Reacciones emoji por miembro: una por cada reseña o comentario.
create table public.sb_anime_discussion_reactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 review_id uuid references public.sb_member_anime_reviews(id) on delete cascade,
 comment_id uuid references public.sb_member_anime_review_comments(id) on delete cascade,
 emoji text not null check (emoji in ('heart','laugh','fire','clap','wow')),
 created_at timestamptz not null default now(),
 constraint sb_anime_reaction_exactly_one_target check ((review_id is not null) <> (comment_id is not null))
);
create unique index sb_anime_reaction_per_user_review
 on public.sb_anime_discussion_reactions(user_id,review_id) where review_id is not null;
create unique index sb_anime_reaction_per_user_comment
 on public.sb_anime_discussion_reactions(user_id,comment_id) where comment_id is not null;
create index sb_anime_reaction_review_idx
 on public.sb_anime_discussion_reactions(review_id) where review_id is not null;
create index sb_anime_reaction_comment_idx
 on public.sb_anime_discussion_reactions(comment_id) where comment_id is not null;
alter table public.sb_anime_discussion_reactions enable row level security;
revoke all on public.sb_anime_discussion_reactions from public,anon,authenticated;
grant select,insert,update,delete on public.sb_anime_discussion_reactions to authenticated;
create policy sb_anime_reaction_read on public.sb_anime_discussion_reactions
 for select to authenticated using (
  (review_id is not null and exists(select 1 from public.sb_member_anime_reviews r where r.id=review_id))
  or (comment_id is not null and exists(select 1 from public.sb_member_anime_review_comments c where c.id=comment_id))
 );
create policy sb_anime_reaction_add on public.sb_anime_discussion_reactions
 for insert to authenticated with check (
  user_id=(select auth.uid()) and (
   (review_id is not null and exists(select 1 from public.sb_member_anime_reviews r where r.id=review_id))
   or (comment_id is not null and exists(select 1 from public.sb_member_anime_review_comments c where c.id=comment_id))
  )
 );
create policy sb_anime_reaction_edit on public.sb_anime_discussion_reactions
 for update to authenticated using(user_id=(select auth.uid()))
 with check (
  user_id=(select auth.uid()) and (
   (review_id is not null and exists(select 1 from public.sb_member_anime_reviews r where r.id=review_id))
   or (comment_id is not null and exists(select 1 from public.sb_member_anime_review_comments c where c.id=comment_id))
  )
 );
create policy sb_anime_reaction_remove on public.sb_anime_discussion_reactions
 for delete to authenticated using(user_id=(select auth.uid()));

-- Al cambiar emoji no puede cambiar el destinatario de una reacción existente.
create function public.sb_guard_anime_reaction_target()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.user_id is distinct from old.user_id
    or new.review_id is distinct from old.review_id
    or new.comment_id is distinct from old.comment_id then
  raise exception 'No se puede cambiar el destinatario de una reacción';
 end if;
 return new;
end $$;
revoke all on function public.sb_guard_anime_reaction_target() from public,anon,authenticated;
create trigger sb_guard_anime_reaction_update before update on public.sb_anime_discussion_reactions
 for each row execute function public.sb_guard_anime_reaction_target();

-- Copia únicamente el distintivo ganado para poder enseñarlo en perfiles públicos.
-- No se exponen título del juego, rival, sesiones ni minutos del reto.
create table public.sb_profile_gaming_medals (
 id uuid primary key default gen_random_uuid(),
 challenge_id uuid not null references public.sb_friend_gaming_challenges(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 week_start date not null,
 medal_kind text not null check(medal_kind in ('champion','tie')),
 awarded_at timestamptz not null default now(),
 unique(challenge_id,recipient_id,week_start)
);
create index sb_profile_gaming_medal_owner_idx
 on public.sb_profile_gaming_medals(recipient_id,week_start desc);
alter table public.sb_profile_gaming_medals enable row level security;
revoke all on public.sb_profile_gaming_medals from public,anon,authenticated;
grant select(id,recipient_id,week_start,medal_kind,awarded_at)
 on public.sb_profile_gaming_medals to authenticated;
create policy sb_profile_gaming_medal_public_read on public.sb_profile_gaming_medals
 for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=recipient_id and p.is_public=true)
 );

create function public.sb_copy_profile_gaming_medal()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.winner_id is not null then
  insert into public.sb_profile_gaming_medals
   (challenge_id,recipient_id,week_start,medal_kind,awarded_at)
  values(new.challenge_id,new.winner_id,new.week_start,'champion',new.awarded_at)
  on conflict(challenge_id,recipient_id,week_start) do nothing;
 elsif new.is_tie then
  insert into public.sb_profile_gaming_medals
   (challenge_id,recipient_id,week_start,medal_kind,awarded_at)
  values
   (new.challenge_id,new.creator_id,new.week_start,'tie',new.awarded_at),
   (new.challenge_id,new.invited_id,new.week_start,'tie',new.awarded_at)
  on conflict(challenge_id,recipient_id,week_start) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.sb_copy_profile_gaming_medal() from public,anon,authenticated;
create trigger sb_copy_profile_gaming_medal_insert
 after insert on public.sb_friend_weekly_medal_history
 for each row execute function public.sb_copy_profile_gaming_medal();

-- Conservar las medallas legítimas existentes sin duplicaciones.
insert into public.sb_profile_gaming_medals
 (challenge_id,recipient_id,week_start,medal_kind,awarded_at)
select m.challenge_id,m.winner_id,m.week_start,'champion',m.awarded_at
 from public.sb_friend_weekly_medal_history m where m.winner_id is not null
on conflict(challenge_id,recipient_id,week_start) do nothing;
insert into public.sb_profile_gaming_medals
 (challenge_id,recipient_id,week_start,medal_kind,awarded_at)
select m.challenge_id,a.recipient_id,m.week_start,'tie',m.awarded_at
 from public.sb_friend_weekly_medal_history m
 cross join lateral (values(m.creator_id),(m.invited_id)) a(recipient_id)
 where m.is_tie
on conflict(challenge_id,recipient_id,week_start) do nothing;
