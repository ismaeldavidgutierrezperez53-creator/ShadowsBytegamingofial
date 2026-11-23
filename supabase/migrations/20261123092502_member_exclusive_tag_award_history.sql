-- Historial privado y permanente de etiquetas ganadas u otorgadas.
-- Los registros anteriores sin fecha real se muestran como importados.
alter table public.sb_member_auto_tag_unlocks
  add column if not exists imported_existing boolean not null default false;
update public.sb_member_auto_tag_unlocks
set imported_existing=true
where celebrated_at is not null and unlocked_at=celebrated_at and imported_existing=false;

create table public.sb_member_tag_grant_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag_id uuid not null,
  tag_label text not null,
  tag_emoji text not null default '⭐',
  tag_color text not null default 'purple',
  tag_animation text not null default 'none',
  granted_at timestamptz not null,
  revoked_at timestamptz,
  granted_by uuid references auth.users(id) on delete set null,
  imported_existing boolean not null default false,
  recorded_at timestamptz not null default now(),
  constraint sb_tag_history_dates_check check (revoked_at is null or revoked_at>=granted_at)
);
create index sb_member_tag_grant_history_lookup
  on public.sb_member_tag_grant_history (user_id,granted_at desc,id desc);

alter table public.sb_member_tag_grant_history enable row level security;
revoke all on public.sb_member_tag_grant_history from public,anon,authenticated;
grant select on public.sb_member_tag_grant_history to authenticated;
grant all on public.sb_member_tag_grant_history to service_role;
create policy sb_member_tag_history_self_read on public.sb_member_tag_grant_history
  for select to authenticated using (user_id=(select auth.uid()));

-- Conservar las fechas reales de las etiquetas administrativas que ya están asignadas.
insert into public.sb_member_tag_grant_history
 (user_id,tag_id,tag_label,tag_emoji,tag_color,tag_animation,granted_at,granted_by)
select a.user_id,a.tag_id,c.label,c.emoji,c.color,c.animation,a.granted_at,a.granted_by
from public.sb_exclusive_tag_assignments a
join public.sb_exclusive_tag_catalog c on c.id=a.tag_id;

create or replace function private.sb_record_member_tag_grant_history()
returns trigger language plpgsql security definer set search_path='' as $body$
declare t record;
begin
 if tg_op='INSERT' then
  select label,emoji,color,animation into t
  from public.sb_exclusive_tag_catalog where id=new.tag_id;
  insert into public.sb_member_tag_grant_history
    (user_id,tag_id,tag_label,tag_emoji,tag_color,tag_animation,granted_at,granted_by)
  values
    (new.user_id,new.tag_id,coalesce(t.label,'Etiqueta especial'),
     coalesce(t.emoji,'⭐'),coalesce(t.color,'purple'),coalesce(t.animation,'none'),
     new.granted_at,new.granted_by);
  return new;
 elsif tg_op='DELETE' then
  update public.sb_member_tag_grant_history h
  set revoked_at=greatest(now(),h.granted_at)
  where h.id=(
    select last.id from public.sb_member_tag_grant_history last
    where last.user_id=old.user_id and last.tag_id=old.tag_id
      and last.revoked_at is null
    order by last.granted_at desc,last.id desc
    limit 1
  );
  return old;
 end if;
 return null;
end
$body$;
revoke all on function private.sb_record_member_tag_grant_history() from public,anon,authenticated;

create trigger sb_admin_tag_history_add
after insert on public.sb_exclusive_tag_assignments
for each row execute function private.sb_record_member_tag_grant_history();
create trigger sb_admin_tag_history_remove
after delete on public.sb_exclusive_tag_assignments
for each row execute function private.sb_record_member_tag_grant_history();

-- Corregir referencia correlacionada de la política anterior.
-- La concesión manual sólo se permite en etiquetas NO automáticas.
drop policy if exists sb_exclusive_assignments_grant_admin on public.sb_exclusive_tag_assignments;
create policy sb_exclusive_assignments_grant_admin on public.sb_exclusive_tag_assignments
for insert to authenticated with check (
 granted_by=(select auth.uid())
 and exists (
  select 1 from public.site_staff_roles staff
  where staff.user_id=(select auth.uid()) and staff.role in ('owner','admin')
 )
 and not exists (
  select 1 from public.sb_exclusive_tag_auto_rules rules
  where rules.tag_id=sb_exclusive_tag_assignments.tag_id
 )
);
