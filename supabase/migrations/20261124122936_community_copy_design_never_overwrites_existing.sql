
-- Copiar un diseño comunitario nunca debe sobrescribir un diseño personal previo.
create or replace function public.copy_shared_community_frame_design(
 p_design_id uuid,p_new_name text)
returns uuid language plpgsql volatile security invoker set search_path='' as $fn$
declare
 v_uid uuid:=(select auth.uid());
 v_style record;
 v_name text:=btrim(p_new_name);
 v_id uuid;
begin
 if v_uid is null then
   raise exception 'Inicia sesión' using errcode='28000';
 end if;
 if v_name is null or char_length(v_name) not between 2 and 40
   or v_name ~ '[[:cntrl:]]' then
   raise exception 'El nombre debe tener entre 2 y 40 caracteres' using errcode='22023';
 end if;
 select d.frame_style,d.primary_color,d.glow_color into v_style
 from public.member_community_reaction_frame_designs d
 where d.design_id=p_design_id and d.shared_at is not null;
 if not found then
   raise exception 'Diseño no disponible públicamente' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(342612,pg_catalog.hashtext(v_uid::text));
 insert into public.member_community_reaction_frame_designs
   (user_id,design_name,frame_style,primary_color,glow_color)
 values(v_uid,v_name,v_style.frame_style,v_style.primary_color,v_style.glow_color)
 on conflict(user_id,design_key) do nothing
 returning design_id into v_id;
 if v_id is null then
   raise exception 'Ya tienes un diseño con ese nombre; escribe otro para guardar la copia'
     using errcode='22023';
 end if;
 return v_id;
end;
$fn$;
revoke all on function public.copy_shared_community_frame_design(uuid,text)
 from public,anon,authenticated;
grant execute on function public.copy_shared_community_frame_design(uuid,text)
 to authenticated;
