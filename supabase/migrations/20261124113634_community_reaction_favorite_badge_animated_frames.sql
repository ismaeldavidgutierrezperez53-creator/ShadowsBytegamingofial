
-- Marcos individuales anime, neón y dorado para insignias favoritas.
alter table public.member_community_reaction_badge_showcase
  add column frame_style text not null default 'anime'
  constraint community_reaction_showcase_frame_style_valid
  check (frame_style in ('anime','neon','gold'));

-- Un miembro solo puede cambiar el marco de sus propias insignias destacadas.
grant update (frame_style,updated_at)
  on public.member_community_reaction_badge_showcase to authenticated;
create policy community_reaction_showcase_update_own_style
  on public.member_community_reaction_badge_showcase
  for update to authenticated
  using (user_id=(select auth.uid()))
  with check (user_id=(select auth.uid()));

create or replace function public.set_my_community_reaction_badge_frame(
  p_badge_key text,p_frame_style text)
returns boolean
language plpgsql volatile security invoker set search_path='' as $fn$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Inicia sesión para personalizar la insignia'
      using errcode='28000';
  end if;
  if p_frame_style is null or p_frame_style not in ('anime','neon','gold') then
    raise exception 'Elige un estilo válido: anime, neon o gold'
      using errcode='22023';
  end if;
  if p_badge_key is null or length(p_badge_key)>128 then
    raise exception 'Insignia no válida'
      using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(342611,pg_catalog.hashtext(v_user::text));
  update public.member_community_reaction_badge_showcase
    set frame_style=p_frame_style,updated_at=now()
    where user_id=v_user and badge_key=p_badge_key;
  if not found then
    raise exception 'Solo puedes personalizar insignias destacadas que hayas conseguido'
      using errcode='22023';
  end if;
  return true;
end;
$fn$;
revoke all on function public.set_my_community_reaction_badge_frame(text,text)
  from public,anon,authenticated;
grant execute on function public.set_my_community_reaction_badge_frame(text,text)
  to authenticated;

-- Mantener el marco elegido al ordenar/quitar/añadir insignias.
create or replace function public.set_my_community_reaction_showcase(p_badge_keys text[])
returns boolean
language plpgsql volatile security invoker set search_path='' as $fn$
declare
  v_user uuid := (select auth.uid());
  v_count integer;
  v_styles jsonb;
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
  perform pg_catalog.pg_advisory_xact_lock(342611,pg_catalog.hashtext(v_user::text));
  select coalesce(pg_catalog.jsonb_object_agg(s.badge_key,s.frame_style),'{}'::jsonb)
    into v_styles
    from public.member_community_reaction_badge_showcase s
    where s.user_id=v_user;

  delete from public.member_community_reaction_badge_showcase s where s.user_id=v_user;
  insert into public.member_community_reaction_badge_showcase
    (user_id,badge_key,position,frame_style)
  select v_user,k.badge_key,k.pos::smallint,
    coalesce(v_styles->>k.badge_key,'anime')
  from unnest(p_badge_keys) with ordinality as k(badge_key,pos);
  return true;
end;
$fn$;
revoke all on function public.set_my_community_reaction_showcase(text[])
  from public,anon,authenticated;
grant execute on function public.set_my_community_reaction_showcase(text[])
  to authenticated;
