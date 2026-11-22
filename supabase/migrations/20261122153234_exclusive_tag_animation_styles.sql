-- Animaciones visuales sin permisos. Control de edición por columna y RLS.
alter table public.sb_exclusive_tag_catalog
 add column if not exists animation text not null default 'none';
alter table public.sb_exclusive_tag_catalog
 add constraint sb_exclusive_tag_animation_check
 check (animation in ('none','shine','neon','pulse','float','sparkle'));
update public.sb_exclusive_tag_catalog
 set animation=case label
  when 'VIP' then 'shine'
  when 'Colaborador' then 'pulse'
  when 'Moderador' then 'neon'
  else animation end
 where is_system=true and animation='none' and label in ('VIP','Colaborador','Moderador');
revoke update on public.sb_exclusive_tag_catalog from public,anon,authenticated;
grant update(animation) on public.sb_exclusive_tag_catalog to authenticated;
create policy sb_exclusive_catalog_animation_admin on public.sb_exclusive_tag_catalog
 for update to authenticated
 using (exists(select 1 from public.site_staff_roles r
  where r.user_id=(select auth.uid()) and r.role in ('owner','admin')))
 with check (exists(select 1 from public.site_staff_roles r
  where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));