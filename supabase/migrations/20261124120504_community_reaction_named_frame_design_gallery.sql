
create table public.member_community_reaction_frame_designs(
 design_id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 design_name text not null check(char_length(design_name) between 2 and 40
   and design_name=btrim(design_name) and design_name !~ '[[:cntrl:]]'),
 design_key text generated always as (lower(btrim(design_name))) stored,
 frame_style text not null check(frame_style in ('anime','neon','gold')),
 primary_color text not null check(primary_color ~ '^#[0-9a-f]{6}$'),
 glow_color text not null check(glow_color ~ '^#[0-9a-f]{6}$'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,design_key)
);
create index frame_designs_owner_updated_idx
 on public.member_community_reaction_frame_designs(user_id,updated_at desc);
alter table public.member_community_reaction_frame_designs enable row level security;
revoke all on public.member_community_reaction_frame_designs from public,anon,authenticated;
grant select,insert,delete on public.member_community_reaction_frame_designs to authenticated;
grant update(design_name,frame_style,primary_color,glow_color,updated_at)
 on public.member_community_reaction_frame_designs to authenticated;
create policy frame_designs_select_self on public.member_community_reaction_frame_designs
 for select to authenticated using(user_id=(select auth.uid()));
create policy frame_designs_insert_self on public.member_community_reaction_frame_designs
 for insert to authenticated with check(user_id=(select auth.uid()));
create policy frame_designs_update_self on public.member_community_reaction_frame_designs
 for update to authenticated using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()));
create policy frame_designs_delete_self on public.member_community_reaction_frame_designs
 for delete to authenticated using(user_id=(select auth.uid()));

create function public.limit_member_frame_design_gallery()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 perform pg_catalog.pg_advisory_xact_lock(342612,pg_catalog.hashtext(new.user_id::text));
 if not exists(select 1 from public.member_community_reaction_frame_designs
               where user_id=new.user_id and design_key=lower(btrim(new.design_name)))
    and (select count(*) from public.member_community_reaction_frame_designs
         where user_id=new.user_id)>=20
 then raise exception 'Puedes guardar hasta 20 diseños por miembro' using errcode='22023';end if;
 return new;
end;$fn$;
create trigger limit_member_frame_design_gallery_before_insert
 before insert on public.member_community_reaction_frame_designs
 for each row execute function public.limit_member_frame_design_gallery();
revoke all on function public.limit_member_frame_design_gallery() from public,anon,authenticated;

create function public.save_my_community_frame_design(
 p_name text,p_style text,p_primary_color text,p_glow_color text)
returns uuid language plpgsql volatile security invoker set search_path='' as $fn$
declare v_user uuid := (select auth.uid());v_name text:=btrim(p_name);v_id uuid;
begin
 if v_user is null then raise exception 'Inicia sesión para guardar diseños' using errcode='28000';end if;
 if v_name is null or char_length(v_name) not between 2 and 40
    or v_name ~ '[[:cntrl:]]'
 then raise exception 'El nombre debe tener entre 2 y 40 caracteres' using errcode='22023';end if;
 if p_style is null or p_style not in ('anime','neon','gold')
    or p_primary_color is null or p_primary_color !~ '^#[0-9A-Fa-f]{6}$'
    or p_glow_color is null or p_glow_color !~ '^#[0-9A-Fa-f]{6}$'
 then raise exception 'Selecciona marco y colores válidos' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(342612,pg_catalog.hashtext(v_user::text));
 insert into public.member_community_reaction_frame_designs
 (user_id,design_name,frame_style,primary_color,glow_color)
 values(v_user,v_name,p_style,lower(p_primary_color),lower(p_glow_color))
 on conflict(user_id,design_key) do update
 set design_name=excluded.design_name,frame_style=excluded.frame_style,
 primary_color=excluded.primary_color,glow_color=excluded.glow_color,updated_at=now()
 returning design_id into v_id;
 return v_id;
end;$fn$;

create function public.delete_my_community_frame_design(p_design_id uuid)
returns boolean language plpgsql volatile security invoker set search_path='' as $fn$
declare v_user uuid:=(select auth.uid());
begin
 if v_user is null then raise exception 'Inicia sesión' using errcode='28000';end if;
 delete from public.member_community_reaction_frame_designs
 where user_id=v_user and design_id=p_design_id;
 if not found then raise exception 'Diseño no encontrado' using errcode='22023';end if;
 return true;
end;$fn$;

create function public.apply_my_community_frame_design(p_design_id uuid,p_badge_key text)
returns boolean language plpgsql volatile security invoker set search_path='' as $fn$
declare v_user uuid:=(select auth.uid());v_frame record;
begin
 if v_user is null then raise exception 'Inicia sesión' using errcode='28000';end if;
 if p_design_id is null or p_badge_key is null or char_length(p_badge_key)>128
 then raise exception 'Selecciona un diseño y una insignia' using errcode='22023';end if;
 select frame_style,primary_color,glow_color into v_frame
 from public.member_community_reaction_frame_designs
 where user_id=v_user and design_id=p_design_id;
 if not found then raise exception 'Diseño no encontrado en tu galería' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(342611,pg_catalog.hashtext(v_user::text));
 update public.member_community_reaction_badge_showcase
 set frame_style=v_frame.frame_style,
     frame_primary_color=v_frame.primary_color,
     frame_glow_color=v_frame.glow_color,
     updated_at=now()
 where user_id=v_user and badge_key=p_badge_key;
 if not found then raise exception 'Solo puedes aplicar diseños a insignias tuyas ya destacadas'
 using errcode='22023';end if;
 return true;
end;$fn$;
revoke all on function public.save_my_community_frame_design(text,text,text,text),
 public.delete_my_community_frame_design(uuid),
 public.apply_my_community_frame_design(uuid,text) from public,anon,authenticated;
grant execute on function public.save_my_community_frame_design(text,text,text,text),
 public.delete_my_community_frame_design(uuid),
 public.apply_my_community_frame_design(uuid,text) to authenticated;
