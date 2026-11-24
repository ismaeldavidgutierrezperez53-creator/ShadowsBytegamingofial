
-- Colores seguros e independientes para cada insignia favorita.
alter table public.member_community_reaction_badge_showcase
  add column frame_primary_color text
    constraint sb_community_frame_primary_hex check (
      frame_primary_color is null or frame_primary_color ~ '^#[0-9A-Fa-f]{6}$'
    ),
  add column frame_glow_color text
    constraint sb_community_frame_glow_hex check (
      frame_glow_color is null or frame_glow_color ~ '^#[0-9A-Fa-f]{6}$'
    );

grant update(frame_primary_color,frame_glow_color)
  on public.member_community_reaction_badge_showcase to authenticated;

-- Guarda ambos colores para una insignia destacada del usuario activo.
create or replace function public.set_my_community_reaction_badge_colors(
  p_badge_key text,p_primary_color text,p_glow_color text)
returns boolean
language plpgsql volatile security invoker set search_path='' as $fn$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Inicia sesión para personalizar los colores'
      using errcode='28000';
  end if;
  if p_badge_key is null or length(p_badge_key)>128
     or (p_primary_color is not null and p_primary_color !~ '^#[0-9A-Fa-f]{6}$')
     or (p_glow_color is not null and p_glow_color !~ '^#[0-9A-Fa-f]{6}$') then
    raise exception 'Solo se aceptan colores hexadecimales seguros'
      using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(342611,pg_catalog.hashtext(v_user::text));
  update public.member_community_reaction_badge_showcase
  set frame_primary_color=lower(p_primary_color),
      frame_glow_color=lower(p_glow_color),
      updated_at=now()
  where user_id=v_user and badge_key=p_badge_key;
  if not found then
    raise exception 'Solo puedes modificar insignias destacadas propias'
      using errcode='22023';
  end if;
  return true;
end;
$fn$;
revoke all on function public.set_my_community_reaction_badge_colors(text,text,text)
  from public,anon,authenticated;
grant execute on function public.set_my_community_reaction_badge_colors(text,text,text)
  to authenticated;

-- Reordenar o actualizar destacados no elimina sus colores elegidos.
create or replace function public.set_my_community_reaction_showcase(p_badge_keys text[])
returns boolean
language plpgsql volatile security invoker set search_path='' as $fn$
declare
  v_user uuid := (select auth.uid());
  v_count integer;
  v_previous jsonb;
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
  select coalesce(pg_catalog.jsonb_object_agg(s.badge_key,
    pg_catalog.jsonb_build_object(
      'frame_style',s.frame_style,
      'frame_primary_color',s.frame_primary_color,
      'frame_glow_color',s.frame_glow_color
    )),'{}'::jsonb)
  into v_previous
  from public.member_community_reaction_badge_showcase s
  where s.user_id=v_user;

  delete from public.member_community_reaction_badge_showcase s where s.user_id=v_user;
  insert into public.member_community_reaction_badge_showcase
    (user_id,badge_key,position,frame_style,frame_primary_color,frame_glow_color)
  select v_user,k.badge_key,k.pos::smallint,
    coalesce(v_previous->k.badge_key->>'frame_style','anime'),
    v_previous->k.badge_key->>'frame_primary_color',
    v_previous->k.badge_key->>'frame_glow_color'
  from unnest(p_badge_keys) with ordinality as k(badge_key,pos);
  return true;
end;
$fn$;
revoke all on function public.set_my_community_reaction_showcase(text[])
  from public,anon,authenticated;
grant execute on function public.set_my_community_reaction_showcase(text[])
  to authenticated;
