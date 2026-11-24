-- Endurecer el acceso al progreso: lectura únicamente desde cuentas autenticadas.
-- Las escrituras deben pasar por la función de sincronización autorizada.
revoke all on public.sb_friend_gaming_weekly_progress from authenticated;
grant select on public.sb_friend_gaming_weekly_progress to authenticated;
