-- Prioridad y fijado privados por miembro, integrados en el historial existente.
-- No se cambian ni borran avisos originales, ni se emiten notificaciones extra.
alter table public.member_notification_history_actions
 add column if not exists is_pinned boolean not null default false;
alter table public.member_notification_history_actions
 add column if not exists priority_override text null
 check (priority_override in ('high','normal'));
create index if not exists sb_notification_history_pinned_user_idx
 on public.member_notification_history_actions(user_id,updated_at desc)
 where is_pinned = true;
create or replace view public.member_notification_history
with (security_invoker=true)
as
select
 h.record_id,
 h.category,
 h.kind,
 h.title,
 h.href,
 h.occurred_at,
 case when h.source_table in ('member_notifications','member_report_notifications')
   then h.is_read else coalesce(a.is_read,h.is_read) end as is_read,
 case when h.source_table in ('member_notifications','member_report_notifications')
   then h.archived_at
   when a.user_id is null then h.archived_at
   else a.archived_at end as archived_at,
 h.source_table,
 coalesce(a.is_pinned,false) as is_pinned,
 case when a.priority_override='high' then true
   when a.priority_override='normal' then false
   else h.kind in (
    'moderation_warning','moderation_suspend','moderation_ban',
    'moderation_lift','tournament_match','competition_start',
    'competition_medal','competition_award','poll_season_prize',
    'poll_museum_prize','shop_season_award','point_goal',
    'mystery_box_award','level_award') end as is_priority,
 a.priority_override
from public.member_notification_history_core h
left join public.member_notification_history_actions a
 on a.user_id=(select auth.uid())
 and a.source_table=h.source_table
 and a.record_id=h.record_id;
comment on column public.member_notification_history_actions.is_pinned is
 'Marca privada de avisos fijados sin alterar la notificación original.';
comment on column public.member_notification_history_actions.priority_override is
 'NULL usa prioridad automática; high fuerza prioritaria; normal desactiva prioridad.';
