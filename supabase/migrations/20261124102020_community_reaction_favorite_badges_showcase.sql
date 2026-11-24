-- Escaparate independiente para hasta cinco insignias de reacciones comunitarias.
-- No altera la vitrina gamer existente ni el catálogo/logros de origen.
create table public.member_community_reaction_badge_showcase (
  user_id uuid not null,
  badge_key text not null,
  position smallint not null check (position between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id,badge_key),
  unique(user_id,position),
  foreign key(user_id,badge_key)
    references public.member_community_reaction_badges(user_id,badge_key)
    on delete cascade
);
create index member_community_reaction_showcase_position_idx
  on public.member_community_reaction_badge_showcase(user_id,position);

alter table public.member_community_reaction_badge_showcase enable row level security;
revoke all on public.member_community_reaction_badge_showcase from public,anon,authenticated;
grant select on public.member_community_reaction_badge_showcase to anon,authenticated;
grant insert,delete on public.member_community_reaction_badge_showcase to authenticated;

create policy community_reaction_showcase_public_or_self
  on public.member_community_reaction_badge_showcase
  for select to anon,authenticated
  using (
    user_id=(select auth.uid())
    or exists (select 1 from public.profiles p
      where p.id=user_id and p.is_public=true)
  );
create policy community_reaction_showcase_insert_self
  on public.member_community_reaction_badge_showcase
  for insert to authenticated
  with check (user_id=(select auth.uid()));
create policy community_reaction_showcase_delete_self
  on public.member_community_reaction_badge_showcase
  for delete to authenticated
  using (user_id=(select auth.uid()));

-- Guardado atómico, validado, y sujeto a las políticas RLS del usuario.
create or replace function public.set_my_community_reaction_showcase(p_badge_keys text[])
returns boolean
language plpgsql volatile security invoker
set search_path = ''
as $fn$
declare
  v_user uuid := (select auth.uid());
  v_count integer;
begin
  if v_user is null then
    raise exception 'Inicia sesión para gestionar tu escaparate'
      using errcode='28000';
  end if;
  if p_badge_keys is null then
    raise exception 'Se requiere una lista de insignias'
      using errcode='22023';
  end if;
  v_count := cardinality(p_badge_keys);
  if v_count > 5 or v_count < 0 then
    raise exception 'Puedes destacar como máximo cinco insignias'
      using errcode='22023';
  end if;
  if exists(select 1 from unnest(p_badge_keys) as k(badge_key)
            where k.badge_key is null or length(k.badge_key)>128)
    or (select count(distinct k.badge_key)
        from unnest(p_badge_keys) as k(badge_key)) <> v_count then
    raise exception 'Insignias repetidas o no válidas'
      using errcode='22023';
  end if;
  if (select count(*) from public.member_community_reaction_badges b
      where b.user_id=v_user and b.badge_key=any(p_badge_keys)) <> v_count then
    raise exception 'Solo puedes destacar insignias que hayas desbloqueado'
      using errcode='22023';
  end if;

  delete from public.member_community_reaction_badge_showcase s
    where s.user_id=v_user;
  insert into public.member_community_reaction_badge_showcase
    (user_id,badge_key,position)
  select v_user, k.badge_key, k.pos::smallint
  from unnest(p_badge_keys) with ordinality as k(badge_key,pos);
  return true;
end;
$fn$;
revoke all on function public.set_my_community_reaction_showcase(text[])
  from public,anon,authenticated;
grant execute on function public.set_my_community_reaction_showcase(text[])
  to authenticated;
