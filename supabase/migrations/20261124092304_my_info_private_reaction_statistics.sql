-- Estadísticas de las reacciones recibidas en Mi Info: lectura privada, sin duplicar cambios de emoji.
-- La función se ejecuta con los permisos del usuario autenticado (SECURITY INVOKER)
-- y respeta las políticas RLS de ambos registros.
CREATE OR REPLACE FUNCTION public.get_my_info_reaction_stats()
 RETURNS TABLE(total_received bigint, last_7_days bigint, last_30_days bigint, active_total bigint, favorite_reaction text, favorite_count bigint, heart_count bigint, laugh_count bigint, fire_count bigint, like_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with viewer as (
  select (select auth.uid()) as user_id
),
received_events as (
  select h.event_type, h.occurred_at
  from public.member_profile_info_reaction_history h, viewer v
  where h.info_user_id = v.user_id
    and h.reactor_id <> v.user_id
),
event_totals as (
  select
    count(*) filter (where event_type = 'added') as total_received,
    count(*) filter (where event_type = 'added' and occurred_at >= now() - interval '7 days') as last_7_days,
    count(*) filter (where event_type = 'added' and occurred_at >= now() - interval '30 days') as last_30_days
  from received_events
),
current_reactions as (
  select r.reaction
  from public.member_profile_info_reactions r, viewer v
  where r.info_user_id = v.user_id
    and r.reactor_id <> v.user_id
),
current_totals as (
  select
    count(*) as active_total,
    count(*) filter (where reaction='heart') as heart_count,
    count(*) filter (where reaction='laugh') as laugh_count,
    count(*) filter (where reaction='fire') as fire_count,
    count(*) filter (where reaction='like') as like_count
  from current_reactions
)
select
  e.total_received, e.last_7_days, e.last_30_days,
  c.active_total,
  case
    when c.active_total = 0 then null
    when c.heart_count = greatest(c.heart_count,c.laugh_count,c.fire_count,c.like_count) then 'heart'
    when c.laugh_count = greatest(c.heart_count,c.laugh_count,c.fire_count,c.like_count) then 'laugh'
    when c.fire_count = greatest(c.heart_count,c.laugh_count,c.fire_count,c.like_count) then 'fire'
    else 'like'
  end as favorite_reaction,
  greatest(c.heart_count,c.laugh_count,c.fire_count,c.like_count) as favorite_count,
  c.heart_count,c.laugh_count,c.fire_count,c.like_count
from event_totals e cross join current_totals c;
$function$
;
revoke all on function public.get_my_info_reaction_stats() from public, anon, authenticated;
grant execute on function public.get_my_info_reaction_stats() to authenticated;
