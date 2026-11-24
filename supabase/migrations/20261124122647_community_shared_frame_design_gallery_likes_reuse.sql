
-- Compartir diseños es optativo; los existentes continúan privados.
alter table public.member_community_reaction_frame_designs
 add column shared_at timestamptz;
create index frame_designs_public_recent_idx
 on public.member_community_reaction_frame_designs(shared_at desc)
 where shared_at is not null;
drop policy frame_designs_select_self on public.member_community_reaction_frame_designs;
create policy frame_designs_select_owner_or_shared
 on public.member_community_reaction_frame_designs
 for select to authenticated
 using(user_id=(select auth.uid()) or shared_at is not null);
grant update(shared_at) on public.member_community_reaction_frame_designs to authenticated;

create table public.member_community_reaction_frame_design_likes(
 design_id uuid not null references public.member_community_reaction_frame_designs(design_id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(design_id,user_id)
);
create index frame_design_likes_owner_idx
 on public.member_community_reaction_frame_design_likes(user_id,created_at desc);
alter table public.member_community_reaction_frame_design_likes enable row level security;
revoke all on public.member_community_reaction_frame_design_likes from public,anon,authenticated;
grant select,insert,delete on public.member_community_reaction_frame_design_likes to authenticated;
create policy community_frame_likes_select_shared_or_self
 on public.member_community_reaction_frame_design_likes for select to authenticated
 using(user_id=(select auth.uid()) or exists(
  select 1 from public.member_community_reaction_frame_designs d
  where d.design_id=member_community_reaction_frame_design_likes.design_id
    and d.shared_at is not null));
create policy community_frame_likes_insert_shared_not_owner
 on public.member_community_reaction_frame_design_likes for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(
  select 1 from public.member_community_reaction_frame_designs d
  where d.design_id=member_community_reaction_frame_design_likes.design_id
    and d.shared_at is not null and d.user_id<>(select auth.uid())));
create policy community_frame_likes_delete_self
 on public.member_community_reaction_frame_design_likes for delete to authenticated
 using(user_id=(select auth.uid()));

create function public.set_my_community_frame_design_shared(
 p_design_id uuid,p_shared boolean)
returns boolean language plpgsql volatile security invoker set search_path='' as $fn$
declare v_uid uuid:=(select auth.uid());
begin
 if v_uid is null then raise exception 'Inicia sesión' using errcode='28000';end if;
 if p_design_id is null or p_shared is null then
   raise exception 'Selecciona diseño y visibilidad' using errcode='22023';end if;
 update public.member_community_reaction_frame_designs
 set shared_at=case when p_shared then coalesce(shared_at,now()) else null end,
     updated_at=now()
 where design_id=p_design_id and user_id=v_uid;
 if not found then raise exception 'No puedes publicar diseños ajenos' using errcode='22023';end if;
 return true;
end;$fn$;

create function public.toggle_community_frame_design_like(p_design_id uuid)
returns boolean language plpgsql volatile security invoker set search_path='' as $fn$
declare v_uid uuid:=(select auth.uid());v_added boolean;
begin
 if v_uid is null then raise exception 'Inicia sesión' using errcode='28000';end if;
 if p_design_id is null or not exists(
   select 1 from public.member_community_reaction_frame_designs d
   where d.design_id=p_design_id and d.shared_at is not null and d.user_id<>v_uid)
 then raise exception 'Solo puedes reaccionar a diseños compartidos por otros miembros'
   using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(342613,pg_catalog.hashtext(v_uid::text||p_design_id::text));
 insert into public.member_community_reaction_frame_design_likes(design_id,user_id)
 values(p_design_id,v_uid)
 on conflict do nothing returning true into v_added;
 if v_added is true then return true;end if;
 delete from public.member_community_reaction_frame_design_likes
 where design_id=p_design_id and user_id=v_uid;
 return false;
end;$fn$;

create function public.apply_shared_community_frame_design(
 p_design_id uuid,p_badge_key text)
returns boolean language plpgsql volatile security invoker set search_path='' as $fn$
declare v_uid uuid:=(select auth.uid());v_style record;
begin
 if v_uid is null then raise exception 'Inicia sesión' using errcode='28000';end if;
 if p_design_id is null or p_badge_key is null or length(p_badge_key)>128 then
   raise exception 'Elige diseño y una insignia destacada' using errcode='22023';end if;
 select d.frame_style,d.primary_color,d.glow_color into v_style
 from public.member_community_reaction_frame_designs d
 where d.design_id=p_design_id and d.shared_at is not null;
 if not found then raise exception 'Diseño no disponible públicamente' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(342611,pg_catalog.hashtext(v_uid::text));
 update public.member_community_reaction_badge_showcase s
 set frame_style=v_style.frame_style,
     frame_primary_color=v_style.primary_color,
     frame_glow_color=v_style.glow_color,
     updated_at=now()
 where s.user_id=v_uid and s.badge_key=p_badge_key;
 if not found then
   raise exception 'Destaca primero una insignia propia para aplicar este diseño' using errcode='22023';
 end if;
 return true;
end;$fn$;

create function public.copy_shared_community_frame_design(
 p_design_id uuid,p_new_name text)
returns uuid language plpgsql volatile security invoker set search_path='' as $fn$
declare v_uid uuid:=(select auth.uid());v_style record;v_name text:=btrim(p_new_name);v_id uuid;
begin
 if v_uid is null then raise exception 'Inicia sesión' using errcode='28000';end if;
 if v_name is null or char_length(v_name) not between 2 and 40
   or v_name ~ '[[:cntrl:]]' then
   raise exception 'El nombre debe tener entre 2 y 40 caracteres' using errcode='22023';end if;
 select d.frame_style,d.primary_color,d.glow_color into v_style
 from public.member_community_reaction_frame_designs d
 where d.design_id=p_design_id and d.shared_at is not null;
 if not found then raise exception 'Diseño no disponible públicamente' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(342612,pg_catalog.hashtext(v_uid::text));
 insert into public.member_community_reaction_frame_designs(
   user_id,design_name,frame_style,primary_color,glow_color)
 values(v_uid,v_name,v_style.frame_style,v_style.primary_color,v_style.glow_color)
 on conflict(user_id,design_key) do update
 set design_name=excluded.design_name,frame_style=excluded.frame_style,
     primary_color=excluded.primary_color,glow_color=excluded.glow_color,updated_at=now()
 returning design_id into v_id;
 return v_id;
end;$fn$;

create function public.list_shared_community_frame_designs()
returns table(
 design_id uuid,creator_id uuid,creator_name text,design_name text,
 frame_style text,primary_color text,glow_color text,shared_at timestamptz,
 like_count bigint,liked_by_me boolean)
language sql stable security invoker set search_path='' as $fn$
 select d.design_id,d.user_id as creator_id,
   coalesce(nullif(btrim(p.display_name),''),nullif(btrim(p.username),''),'Miembro') as creator_name,
   d.design_name,d.frame_style,d.primary_color,d.glow_color,d.shared_at,
   (select count(*) from public.member_community_reaction_frame_design_likes l
    where l.design_id=d.design_id) as like_count,
   exists(select 1 from public.member_community_reaction_frame_design_likes l
    where l.design_id=d.design_id and l.user_id=(select auth.uid())) as liked_by_me
 from public.member_community_reaction_frame_designs d
 left join public.profiles p on p.id=d.user_id and p.is_public=true
 where d.shared_at is not null
 order by d.shared_at desc,d.design_id
 limit 60;
$fn$;
revoke all on function public.set_my_community_frame_design_shared(uuid,boolean),
 public.toggle_community_frame_design_like(uuid),
 public.apply_shared_community_frame_design(uuid,text),
 public.copy_shared_community_frame_design(uuid,text),
 public.list_shared_community_frame_designs()
 from public,anon,authenticated;
grant execute on function public.set_my_community_frame_design_shared(uuid,boolean),
 public.toggle_community_frame_design_like(uuid),
 public.apply_shared_community_frame_design(uuid,text),
 public.copy_shared_community_frame_design(uuid,text),
 public.list_shared_community_frame_designs()
 to authenticated;
