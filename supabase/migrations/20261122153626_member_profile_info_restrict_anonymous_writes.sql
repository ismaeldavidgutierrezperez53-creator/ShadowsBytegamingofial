-- Revocar privilegios de escritura otorgados por defecto al rol anónimo.
-- RLS mantiene la lectura de Info compartida; únicamente el dueño puede escribir.
revoke all on table public.member_profile_info from public, anon;
grant select on table public.member_profile_info to anon;
grant select, insert, update, delete on table public.member_profile_info to authenticated;
