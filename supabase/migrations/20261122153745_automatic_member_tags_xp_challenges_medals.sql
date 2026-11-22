-- Desbloqueos por niveles (XP), retos reclamados y medallas de metas verificadas.
-- No se exponen escrituras de las recompensas automáticas a ningún cliente.
create table if not exists public.sb_exclusive_tag_auto_rules (
 tag_id uuid primary key references public.sb_exclusive_tag_catalog(id) on delete cascade,
 criterion text not null check (criterion in ('xp','claimed_challenges','completed_goals')),
 target_value integer not null check (target_value between 1 and 1000000),
 created_at timestamptz not null default now()
);
alter table public.sb_exclusive_tag_auto_rules enable row level security;
revoke all on public.sb_exclusive_tag_auto_rules from public,anon,authenticated;
grant select on public.sb_exclusive_tag_auto_rules to anon,authenticated;
grant all on public.sb_exclusive_tag_auto_rules to service_role;
create policy sb_exclusive_auto_rules_read on public.sb_exclusive_tag_auto_rules
 for select to anon,authenticated using (true);
insert into public.sb_exclusive_tag_catalog(label,emoji,color,animation,is_system)
values
 ('Explorador Otaku','🌸','green','sparkle',true),
 ('Guardián Gamer','🎮','blue','pulse',true),
 ('Maestro de Sombras','🏆','purple','neon',true),
 ('Leyenda Shadows Byte','💎','gold','shine',true),
 ('Cazador de Retos','🔥','orange','float',true),
 ('Medallista Byte','⭐','pink','sparkle',true)
on conflict (label) do nothing;
insert into public.sb_exclusive_tag_auto_rules(tag_id,criterion,target_value)
select id,
 case label when 'Cazador de Retos' then 'claimed_challenges'
  when 'Medallista Byte' then 'completed_goals' else 'xp' end,
 case label when 'Explorador Otaku' then 100 when 'Guardián Gamer' then 400
  when 'Maestro de Sombras' then 1600 when 'Leyenda Shadows Byte' then 4900
  when 'Cazador de Retos' then 3 when 'Medallista Byte' then 1 else 1 end
from public.sb_exclusive_tag_catalog
where is_system and label in
 ('Explorador Otaku','Guardián Gamer','Maestro de Sombras',
  'Leyenda Shadows Byte','Cazador de Retos','Medallista Byte')
on conflict(tag_id) do nothing;
drop policy if exists sb_exclusive_assignments_grant_admin on public.sb_exclusive_tag_assignments;
create policy sb_exclusive_assignments_grant_admin on public.sb_exclusive_tag_assignments
 for insert to authenticated with check (
 granted_by=(select auth.uid())
 and exists(select 1 from public.site_staff_roles r where r.user_id=(select auth.uid())
   and r.role in ('owner','admin'))
 and not exists(select 1 from public.sb_exclusive_tag_auto_rules a where a.tag_id=tag_id));
create or replace function public.get_member_auto_exclusive_progress(target_members uuid[])
returns table(member_id uuid,tag_id uuid,label text,emoji text,color text,animation text,
 criterion text,target_value integer,current_value bigint,unlocked boolean)
language plpgsql stable security definer set search_path = ''
as $function$
begin
 if target_members is null or coalesce(array_length(target_members,1),0)>100 then
  raise exception 'Lista de miembros inválida' using errcode='22023';
 end if;
 return query
 with allowed_members as (
  select distinct p.id
  from unnest(target_members) as input(user_id)
  join public.profiles p on p.id=input.user_id
  where (p.is_public=true or p.id=(select auth.uid()))
    and not exists(select 1 from public.member_blocks b
      where (b.blocker_id=(select auth.uid()) and b.blocked_id=p.id)
      or (b.blocked_id=(select auth.uid()) and b.blocker_id=p.id))
 ), counts as (
  select a.id,
    greatest(coalesce(public.community_member_xp(a.id),0),0)::bigint as xp_count,
    (select count(*) from public.member_shop_challenge_claims s where s.user_id=a.id) as claims_count,
    (select count(*) from public.member_point_goal_medals m
      join public.member_point_goals g on g.id=m.goal_id and g.user_id=m.user_id
      where m.user_id=a.id and g.completed_at is not null) as goals_count
  from allowed_members a
 )
 select counts.id,cat.id,cat.label,cat.emoji,cat.color,cat.animation,
  rule.criterion,rule.target_value,
  (case rule.criterion when 'xp' then counts.xp_count
    when 'claimed_challenges' then counts.claims_count
    when 'completed_goals' then counts.goals_count else 0::bigint end) as current_value,
  (case rule.criterion when 'xp' then counts.xp_count
    when 'claimed_challenges' then counts.claims_count
    when 'completed_goals' then counts.goals_count else 0::bigint end)>=rule.target_value::bigint as unlocked
 from counts cross join public.sb_exclusive_tag_auto_rules rule
 join public.sb_exclusive_tag_catalog cat on cat.id=rule.tag_id
 order by counts.id,rule.target_value,cat.label;
end
$function$;
revoke all on function public.get_member_auto_exclusive_progress(uuid[]) from public,anon,authenticated;
grant execute on function public.get_member_auto_exclusive_progress(uuid[]) to anon,authenticated,service_role;