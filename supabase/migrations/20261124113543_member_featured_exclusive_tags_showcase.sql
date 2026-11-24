-- Vitrina de hasta tres etiquetas exclusivas; validada y ordenada en el servidor.
create table if not exists public.sb_member_featured_tags (
 user_id uuid not null references public.profiles(id) on delete cascade,
 slot smallint not null check(slot between 1 and 3),
 tag_id uuid not null references public.sb_exclusive_tag_catalog(id) on delete cascade,
 updated_at timestamptz not null default now(),
 primary key(user_id,slot),
 unique(user_id,tag_id)
);
create index if not exists sb_member_featured_tags_tag_idx on public.sb_member_featured_tags(tag_id);
alter table public.sb_member_featured_tags enable row level security;
revoke all on public.sb_member_featured_tags from public,anon,authenticated;
grant select on public.sb_member_featured_tags to authenticated;
grant all on public.sb_member_featured_tags to service_role;
create policy sb_featured_tags_owner_read on public.sb_member_featured_tags
 for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.sb_get_member_featured_tags(p_user uuid)
returns table(slot smallint,tag_id uuid,label text,emoji text,color text,animation text,source text)
language plpgsql stable security definer set search_path='' as $fn$
begin
 if p_user is null or not exists(
   select 1 from public.profiles p
   where p.id=p_user and (p.is_public=true or p.id=(select auth.uid()))
 ) then return; end if;
 if (select auth.uid()) is not null and exists(
   select 1 from public.member_blocks b
   where (b.blocker_id=(select auth.uid()) and b.blocked_id=p_user)
      or (b.blocked_id=(select auth.uid()) and b.blocker_id=p_user)
 ) then return; end if;
 return query
 select f.slot,cat.id,cat.label,cat.emoji,cat.color,cat.animation,
   case when exists(
     select 1 from public.sb_exclusive_tag_assignments a
     where a.user_id=p_user and a.tag_id=f.tag_id
   ) then 'admin'::text else 'automatic'::text end
 from public.sb_member_featured_tags f
 join public.sb_exclusive_tag_catalog cat on cat.id=f.tag_id
 where f.user_id=p_user and (
   exists(select 1 from public.sb_exclusive_tag_assignments a
     where a.user_id=p_user and a.tag_id=f.tag_id)
   or exists(
     select 1 from public.get_member_auto_exclusive_progress(array[p_user]) progress
     where progress.tag_id=f.tag_id and progress.unlocked
   )
 )
 order by f.slot;
end $fn$;
revoke all on function public.sb_get_member_featured_tags(uuid) from public,anon,authenticated;
grant execute on function public.sb_get_member_featured_tags(uuid) to anon,authenticated,service_role;

create or replace function public.sb_set_my_featured_tags(p_tag_ids uuid[])
returns jsonb
language plpgsql volatile security definer set search_path='' as $fn$
declare
 uid uuid:=(select auth.uid());
 amount int:=coalesce(array_length(p_tag_ids,1),0);
 distinct_amount int;
 valid_amount int;
begin
 if uid is null then raise exception 'Debes iniciar sesión.' using errcode='28000'; end if;
 if amount>3 then
  raise exception 'Puedes destacar como máximo tres etiquetas.' using errcode='22023';
 end if;
 select count(distinct id) into distinct_amount from unnest(p_tag_ids) as input(id);
 if distinct_amount<>amount then
  raise exception 'No puedes repetir una etiqueta.' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,91752));
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
 if valid_amount<>amount then
  raise exception 'Solo puedes destacar etiquetas que hayas conseguido y mantengas activas.'
   using errcode='22023';
 end if;
 delete from public.sb_member_featured_tags f where f.user_id=uid;
 insert into public.sb_member_featured_tags(user_id,slot,tag_id)
 select uid,ordinality::smallint,id
 from unnest(p_tag_ids) with ordinality as selected(id,ordinality);
 return pg_catalog.jsonb_build_object('saved',amount);
end $fn$;
revoke all on function public.sb_set_my_featured_tags(uuid[]) from public,anon,authenticated;
grant execute on function public.sb_set_my_featured_tags(uuid[]) to authenticated,service_role;