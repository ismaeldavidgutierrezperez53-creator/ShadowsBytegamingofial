-- Historial de reacciones recibidas en Mi Info (solo visible para el propietario).
create table if not exists public.member_profile_info_reaction_history (
  id bigint generated always as identity primary key,
  info_user_id uuid not null references auth.users(id) on delete cascade,
  reactor_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('heart','laugh','fire','like')),
  event_type text not null check (event_type in ('added','changed')),
  occurred_at timestamptz not null default now()
);
create index if not exists member_info_reaction_history_owner_time_idx
  on public.member_profile_info_reaction_history(info_user_id,occurred_at desc,id desc);
alter table public.member_profile_info_reaction_history enable row level security;
revoke all on public.member_profile_info_reaction_history from public,anon,authenticated;
grant select on public.member_profile_info_reaction_history to authenticated;
drop policy if exists member_info_reaction_history_owner_read on public.member_profile_info_reaction_history;
create policy member_info_reaction_history_owner_read on public.member_profile_info_reaction_history
  for select to authenticated using (info_user_id=(select auth.uid()));
create or replace function private.record_member_info_reaction_history()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
  if new.info_user_id=new.reactor_id then return new; end if;
  if tg_op='UPDATE' and old.reaction is not distinct from new.reaction then return new; end if;
  insert into public.member_profile_info_reaction_history
    (info_user_id,reactor_id,reaction,event_type,occurred_at)
  values (new.info_user_id,new.reactor_id,new.reaction,
    case when tg_op='INSERT' then 'added' else 'changed' end,now());
  return new;
end;
$fn$;
revoke all on function private.record_member_info_reaction_history()
  from public,anon,authenticated;
drop trigger if exists record_member_info_reaction_history on public.member_profile_info_reactions;
create trigger record_member_info_reaction_history
 after insert or update of reaction on public.member_profile_info_reactions
 for each row execute function private.record_member_info_reaction_history();
-- Recuperar solo reacciones activas anteriores al historial, sin crear reacciones nuevas.
insert into public.member_profile_info_reaction_history
 (info_user_id,reactor_id,reaction,event_type,occurred_at)
select info_user_id,reactor_id,reaction,'added',created_at
from public.member_profile_info_reactions where reactor_id<>info_user_id;
