-- Reacciones a la Info pública de los miembros. Una por cuenta y perfil.
create table if not exists public.member_profile_info_reactions (
  info_user_id uuid not null references public.member_profile_info(user_id) on delete cascade,
  reactor_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('heart','laugh','fire','like')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (info_user_id,reactor_id),
  constraint info_reaction_not_self check (info_user_id <> reactor_id)
);
alter table public.member_profile_info_reactions enable row level security;
revoke all on public.member_profile_info_reactions from public, anon;
grant select on public.member_profile_info_reactions to anon;
grant select,insert,update,delete on public.member_profile_info_reactions to authenticated;

drop policy if exists "info_reactions_read_visible" on public.member_profile_info_reactions;
create policy "info_reactions_read_visible" on public.member_profile_info_reactions
 for select to anon,authenticated
 using (
   info_user_id = (select auth.uid())
   or exists (
     select 1 from public.member_profile_info info
     join public.profiles profile on profile.id=info.user_id
     where info.user_id=info_user_id and info.is_public=true
       and nullif(btrim(info.about_text),'') is not null
       and profile.is_public=true
   )
 );

drop policy if exists "info_reactions_insert_own" on public.member_profile_info_reactions;
create policy "info_reactions_insert_own" on public.member_profile_info_reactions
 for insert to authenticated
 with check (
   reactor_id = (select auth.uid()) and info_user_id <> (select auth.uid())
   and exists (
     select 1 from public.member_profile_info info
     join public.profiles profile on profile.id=info.user_id
     where info.user_id=info_user_id and info.is_public=true
       and nullif(btrim(info.about_text),'') is not null
       and profile.is_public=true
   )
 );

drop policy if exists "info_reactions_update_own" on public.member_profile_info_reactions;
create policy "info_reactions_update_own" on public.member_profile_info_reactions
 for update to authenticated
 using (reactor_id = (select auth.uid()))
 with check (
   reactor_id = (select auth.uid()) and info_user_id <> (select auth.uid())
   and exists (
     select 1 from public.member_profile_info info
     join public.profiles profile on profile.id=info.user_id
     where info.user_id=info_user_id and info.is_public=true
       and nullif(btrim(info.about_text),'') is not null
       and profile.is_public=true
   )
 );

drop policy if exists "info_reactions_delete_own" on public.member_profile_info_reactions;
create policy "info_reactions_delete_own" on public.member_profile_info_reactions
 for delete to authenticated
 using (reactor_id = (select auth.uid()));
