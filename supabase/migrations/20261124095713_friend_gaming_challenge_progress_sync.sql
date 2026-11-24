-- Sólo se muestran los minutos agregados de retos aceptados.
create table public.sb_friend_gaming_challenge_progress(
 challenge_id uuid not null references public.sb_friend_gaming_challenges(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 minutes_played integer not null default 0 check(minutes_played between 0 and 1000000),
 updated_at timestamptz not null default now(),
 primary key(challenge_id,user_id)
);
alter table public.sb_friend_gaming_challenge_progress enable row level security;
revoke all on public.sb_friend_gaming_challenge_progress from public,anon;
grant select,insert,update on public.sb_friend_gaming_challenge_progress to authenticated;
create policy sb_friend_progress_members_select on public.sb_friend_gaming_challenge_progress
 for select to authenticated using(
 exists(select 1 from public.sb_friend_gaming_challenges ch
 where ch.id=challenge_id and ch.status='accepted'
 and (select auth.uid()) in (ch.creator_id,ch.invited_id))
);
create policy sb_friend_progress_owner_insert on public.sb_friend_gaming_challenge_progress
 for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(
 select 1 from public.sb_friend_gaming_challenges ch
 where ch.id=challenge_id and ch.status='accepted'
 and user_id in(ch.creator_id,ch.invited_id))
);
-- El navegador no puede editar los minutos a mano: se recalculan desde sesiones privadas.
revoke insert,update on public.sb_friend_gaming_challenge_progress from authenticated;
drop policy sb_friend_progress_owner_insert on public.sb_friend_gaming_challenge_progress;

-- La función comprueba el usuario y el reto antes de consultar sus sesiones.
-- Devuelve exclusivamente su total propio; no expone sesiones de otros miembros.
create function public.sb_sync_friend_challenge_progress(challenge_key uuid)
returns bigint language plpgsql security definer
set search_path = ''
as $$
declare
 actor uuid := (select auth.uid());
 ch record;
 total bigint;
begin
 if actor is null then raise exception 'Inicia sesión'; end if;
 select id,creator_id,invited_id,game_title,starts_on,ends_on,status
 into ch from public.sb_friend_gaming_challenges
 where id=challenge_key and status='accepted'
 and actor in (creator_id,invited_id);
 if not found then raise exception 'Reto no disponible'; end if;
 select coalesce(sum(s.minutes_played),0)::bigint into total
 from public.member_gaming_sessions s
 where s.user_id=actor
 and lower(btrim(s.game_title))=lower(btrim(ch.game_title))
 and s.played_on between ch.starts_on and ch.ends_on;
 insert into public.sb_friend_gaming_challenge_progress(challenge_id,user_id,minutes_played,updated_at)
 values(challenge_key,actor,least(total,1000000)::integer,now())
 on conflict(challenge_id,user_id)
 do update set minutes_played=excluded.minutes_played,updated_at=now();
 return total;
end $$;
revoke all on function public.sb_sync_friend_challenge_progress(uuid) from public,anon;
grant execute on function public.sb_sync_friend_challenge_progress(uuid) to authenticated;
