-- Clasificación privada (top 10) por reacciones nuevas recibidas en Mi Info.
-- SECURITY INVOKER aplica RLS; excluir propias y cambios de emoji.
CREATE OR REPLACE FUNCTION public.get_my_info_reaction_ranking(p_limit integer DEFAULT 10)
 RETURNS TABLE(reactor_id uuid, reactions bigint, last_reacted_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select h.reactor_id,
         pg_catalog.count(*)::bigint as reactions,
         pg_catalog.max(h.occurred_at) as last_reacted_at
  from public.member_profile_info_reaction_history h
  where h.info_user_id = (select auth.uid())
    and h.reactor_id <> (select auth.uid())
    and h.event_type = 'added'
  group by h.reactor_id
  order by reactions desc, last_reacted_at desc, h.reactor_id
  limit least(greatest(coalesce(p_limit,10),1),20);
$function$
;
revoke all on function public.get_my_info_reaction_ranking(integer) from public,anon,authenticated;
grant execute on function public.get_my_info_reaction_ranking(integer) to authenticated;
