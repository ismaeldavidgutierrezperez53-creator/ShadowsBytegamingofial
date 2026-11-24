
-- Avisos persistentes y privados de insignias comunitarias.
create table public.member_community_reaction_badge_notifications (
  user_id uuid not null,
  badge_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  celebrated_at timestamptz,
  primary key(user_id,badge_key),
  foreign key(user_id,badge_key) references public.member_community_reaction_badges(user_id,badge_key)
    on delete cascade
);
create index member_community_reaction_badge_notifications_uncelebrated_idx
  on public.member_community_reaction_badge_notifications(user_id,created_at)
  where celebrated_at is null;
alter table public.member_community_reaction_badge_notifications enable row level security;
revoke all on public.member_community_reaction_badge_notifications from public,anon,authenticated;
grant select on public.member_community_reaction_badge_notifications to authenticated;
create policy member_community_reaction_badge_notices_owner
  on public.member_community_reaction_badge_notifications
  for select to authenticated using(user_id=(select auth.uid()));

-- Solo los nuevos desbloqueos crean avisos, nunca los importados de la migración anterior.
create or replace function private.sb_notify_community_reaction_badge_unlock()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
  insert into public.member_community_reaction_badge_notifications(user_id,badge_key)
    values(new.user_id,new.badge_key)
    on conflict(user_id,badge_key) do nothing;
  return new;
end;
$fn$;
revoke all on function private.sb_notify_community_reaction_badge_unlock()
  from public,anon,authenticated;
create trigger sb_community_reaction_badge_notify
after insert on public.member_community_reaction_badges
for each row execute function private.sb_notify_community_reaction_badge_unlock();

-- Reclama atómicamente una celebración pendiente por usuario autenticado.
-- Evita repetirla en distintas pestañas/dispositivos y no permite
-- a los clientes inventar avisos ni marcar los de otros usuarios.
create or replace function public.claim_my_community_reaction_badge_celebration()
returns table(badge_key text,title text,emoji text)
language plpgsql volatile security definer set search_path='' as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_key text;
begin
  if v_uid is null then return; end if;
  select n.badge_key into v_key
  from public.member_community_reaction_badge_notifications n
  where n.user_id=v_uid and n.celebrated_at is null
  order by n.created_at,n.badge_key
  for update skip locked
  limit 1;
  if v_key is null then return; end if;
  update public.member_community_reaction_badge_notifications n
  set celebrated_at=now()
  where n.user_id=v_uid and n.badge_key=v_key and n.celebrated_at is null;
  return query
  select c.badge_key,c.title,c.emoji
  from public.member_community_reaction_badge_catalog c where c.badge_key=v_key;
end;
$fn$;
revoke all on function public.claim_my_community_reaction_badge_celebration()
  from public,anon,authenticated;
grant execute on function public.claim_my_community_reaction_badge_celebration()
  to authenticated;
