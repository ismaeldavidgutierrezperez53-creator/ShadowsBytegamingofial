-- Etiqueta principal: una sola de las tres etiquetas destacadas del propio miembro.
alter table public.sb_member_featured_tags
 add column is_primary boolean not null default false;
create unique index sb_member_one_primary_featured_tag
 on public.sb_member_featured_tags(user_id) where is_primary;

create or replace function public.sb_set_my_primary_featured_tag(p_tag_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path='' as $fn$
declare uid uuid:=(select auth.uid());
begin
 if uid is null then raise exception 'Debes iniciar sesión' using errcode='28000';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,91752));
 if p_tag_id is not null then
  if not exists(
    select 1 from public.sb_member_featured_tags f
    where f.user_id=uid and f.tag_id=p_tag_id
  ) then raise exception 'La etiqueta principal debe estar entre tus tres favoritas guardadas'
    using errcode='22023';end if;
  if not(
    exists(select 1 from public.sb_exclusive_tag_assignments a where a.user_id=uid and a.tag_id=p_tag_id)
    or exists(select 1 from public.get_member_auto_exclusive_progress(array[uid]) p
      where p.tag_id=p_tag_id and p.unlocked)
  ) then raise exception 'Ya no tienes esta etiqueta desbloqueada' using errcode='22023';end if;
 end if;
 update public.sb_member_featured_tags f
 set is_primary=false,updated_at=now()
 where f.user_id=uid and f.is_primary;
 if p_tag_id is not null then
  update public.sb_member_featured_tags f
  set is_primary=true,updated_at=now()
  where f.user_id=uid and f.tag_id=p_tag_id;
 end if;
 return pg_catalog.jsonb_build_object('primary_tag_id',p_tag_id);
end $fn$;
revoke all on function public.sb_set_my_primary_featured_tag(uuid) from public,anon,authenticated;
grant execute on function public.sb_set_my_primary_featured_tag(uuid) to authenticated,service_role;

-- Preservar etiqueta principal si sigue entre las favoritas después de guardar.
create or replace function public.sb_set_my_featured_tags(p_tag_ids uuid[])
returns jsonb
language plpgsql volatile security definer set search_path='' as $fn$
declare uid uuid:=(select auth.uid());
 amount integer:=coalesce(array_length(p_tag_ids,1),0);
 distinct_amount integer;
 valid_amount integer;
 previous_primary uuid;
begin
 if uid is null then raise exception 'Debes iniciar sesión.' using errcode='28000';end if;
 if amount>3 then raise exception 'Puedes destacar como máximo tres etiquetas.' using errcode='22023';end if;
 select count(distinct id) into distinct_amount from unnest(p_tag_ids) as input(id);
 if distinct_amount<>amount then
  raise exception 'No puedes repetir una etiqueta.' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,91752));
 select f.tag_id into previous_primary
 from public.sb_member_featured_tags f where f.user_id=uid and f.is_primary limit 1;
 select count(*) into valid_amount
 from unnest(p_tag_ids) as request(id)
 join public.sb_exclusive_tag_catalog c on c.id=request.id
 where exists(
   select 1 from public.sb_exclusive_tag_assignments a
   where a.user_id=uid and a.tag_id=request.id
 ) or exists(
   select 1 from public.get_member_auto_exclusive_progress(array[uid]) progress
   where progress.tag_id=request.id and progress.unlocked
 );
 if valid_amount<>amount then raise exception
   'Solo puedes destacar etiquetas que hayas conseguido y mantengas activas.'
   using errcode='22023';end if;
 delete from public.sb_member_featured_tags f where f.user_id=uid;
 insert into public.sb_member_featured_tags(user_id,slot,tag_id,is_primary)
 select uid,ordinality::smallint,id,(id=previous_primary)
 from unnest(p_tag_ids) with ordinality as selected(id,ordinality);
 return pg_catalog.jsonb_build_object('saved',amount,'primary_tag_id',
   case when previous_primary=any(p_tag_ids) then previous_primary else null end);
end $fn$;
revoke all on function public.sb_set_my_featured_tags(uuid[]) from public,anon,authenticated;
grant execute on function public.sb_set_my_featured_tags(uuid[]) to authenticated,service_role;

-- Sólo se publican etiquetas principales realmente destacadas y desbloqueadas.
-- El RPC de vitrina anterior aplica además visibilidad del perfil y bloqueos.
create or replace function public.sb_get_member_primary_featured_tags(p_members uuid[])
returns table(
 member_id uuid,tag_id uuid,label text,emoji text,color text,animation text,source text
)
language plpgsql stable security definer set search_path='' as $fn$
begin
 if p_members is null or coalesce(array_length(p_members,1),0)>100 then
  raise exception 'Lista de miembros inválida' using errcode='22023';end if;
 return query
 select u.id,f.tag_id,eligible.label,eligible.emoji,eligible.color,eligible.animation,eligible.source
 from (select distinct id from unnest(p_members) as ids(id) where id is not null) u
 join public.sb_member_featured_tags f on f.user_id=u.id and f.is_primary=true
 join lateral public.sb_get_member_featured_tags(u.id) eligible on eligible.tag_id=f.tag_id;
end $fn$;
revoke all on function public.sb_get_member_primary_featured_tags(uuid[]) from public,anon,authenticated;
grant execute on function public.sb_get_member_primary_featured_tags(uuid[])
 to anon,authenticated,service_role;