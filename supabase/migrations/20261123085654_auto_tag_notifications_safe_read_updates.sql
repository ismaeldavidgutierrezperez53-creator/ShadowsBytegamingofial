-- Permitir leer o archivar notificaciones propias, pero nunca falsificar sus recompensas.
revoke update on public.member_notifications from public,anon,authenticated;
grant update(is_read,dismissed_at) on public.member_notifications to authenticated;