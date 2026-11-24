CREATE OR REPLACE FUNCTION public.sb_set_my_featured_tags(p_tag_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 select uid,ordinality::smallint,id,coalesce(id=previous_primary,false)
 from unnest(p_tag_ids) with ordinality as selected(id,ordinality);
 return pg_catalog.jsonb_build_object('saved',amount,'primary_tag_id',
   case when previous_primary=any(p_tag_ids) then previous_primary else null end);
end $function$
