-- Permitir reacciones también a la propia Info, manteniendo autenticación, perfil público y una reacción por usuario.
alter table public.member_profile_info_reactions
  drop constraint if exists info_reaction_not_self;

drop policy if exists "info_reactions_insert_own" on public.member_profile_info_reactions;
create policy "info_reactions_insert_own" on public.member_profile_info_reactions
 for insert to authenticated
 with check (
   reactor_id=(select auth.uid())
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
 using (reactor_id=(select auth.uid()))
 with check (
   reactor_id=(select auth.uid())
   and exists (
     select 1 from public.member_profile_info info
     join public.profiles profile on profile.id=info.user_id
     where info.user_id=info_user_id and info.is_public=true
       and nullif(btrim(info.about_text),'') is not null
       and profile.is_public=true
   )
 );
