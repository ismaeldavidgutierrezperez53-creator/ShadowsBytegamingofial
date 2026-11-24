-- Evolución privada de nuevas reacciones recibidas por día y mes, con fechas Europe/Madrid.
-- Cambios de emoji y reacciones a la propia Info quedan excluidos.
CREATE OR REPLACE FUNCTION public.get_my_info_reaction_evolution()
 RETURNS TABLE(period_type text, period_start date, reactions bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with viewer as (
  select (select auth.uid()) as user_id,
         (now() at time zone 'Europe/Madrid')::date as today
),
days as (
  select gs.day::date as period_start
  from viewer v
  cross join lateral pg_catalog.generate_series(
    v.today - interval '29 days', v.today, interval '1 day') as gs(day)
),
months as (
  select gs.month::date as period_start
  from viewer v
  cross join lateral pg_catalog.generate_series(
    pg_catalog.date_trunc('month', v.today::timestamp) - interval '11 months',
    pg_catalog.date_trunc('month', v.today::timestamp),
    interval '1 month') as gs(month)
),
received as (
  select (h.occurred_at at time zone 'Europe/Madrid')::date as local_day
  from public.member_profile_info_reaction_history h
  cross join viewer v
  where h.info_user_id = v.user_id
    and h.reactor_id <> v.user_id
    and h.event_type = 'added'
    and h.occurred_at >=
      (v.today - interval '1 year') at time zone 'Europe/Madrid'
),
daily as (
  select 'daily'::text as period_type,
         d.period_start,
         pg_catalog.count(r.local_day)::bigint as reactions
  from days d
  left join received r on r.local_day = d.period_start
  group by d.period_start
),
monthly as (
  select 'monthly'::text as period_type,
         m.period_start,
         pg_catalog.count(r.local_day)::bigint as reactions
  from months m
  left join received r
    on r.local_day >= m.period_start
   and r.local_day < (m.period_start + interval '1 month')::date
  group by m.period_start
)
select * from daily
union all
select * from monthly
order by period_type,period_start;
$function$
;
revoke all on function public.get_my_info_reaction_evolution() from public,anon,authenticated;
grant execute on function public.get_my_info_reaction_evolution() to authenticated;
