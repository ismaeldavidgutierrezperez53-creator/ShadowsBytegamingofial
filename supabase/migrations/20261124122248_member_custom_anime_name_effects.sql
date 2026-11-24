-- Preferencia cosmética de efecto anime para el nombre; no otorga permisos.
-- El efecto se muestra únicamente cuando hay una etiqueta principal válida.
create table public.sb_member_name_effects (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 effect text not null default 'classic'
  check(effect in ('classic','none','fire','lightning','stars','hearts','legendary')),
 updated_at timestamptz not null default now()
);
create index sb_member_name_effects_effect_idx on public.sb_member_name_effects(effect);
alter table public.sb_member_name_effects enable row level security;
revoke all on public.sb_member_name_effects from public,anon,authenticated;
grant select on public.sb_member_name_effects to anon,authenticated;
grant insert(user_id,effect,updated_at),update(effect,updated_at) on public.sb_member_name_effects to authenticated;
grant all on public.sb_member_name_effects to service_role;

-- Las preferencias visibles siguen la visibilidad del perfil y los bloqueos.
create policy sb_member_name_effects_public_read on public.sb_member_name_effects
 for select to anon,authenticated using (
  exists (
   select 1 from public.profiles p
   where p.id=sb_member_name_effects.user_id
     and (p.is_public=true or p.id=(select auth.uid()))
  )
  and not exists (
   select 1 from public.member_blocks b
   where ((b.blocker_id=(select auth.uid()) and b.blocked_id=sb_member_name_effects.user_id)
    or (b.blocked_id=(select auth.uid()) and b.blocker_id=sb_member_name_effects.user_id))
  )
 );
create policy sb_member_name_effects_self_insert on public.sb_member_name_effects
 for insert to authenticated with check (user_id=(select auth.uid()));
create policy sb_member_name_effects_self_update on public.sb_member_name_effects
 for update to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()));
