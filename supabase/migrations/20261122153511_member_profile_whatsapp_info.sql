-- Info permanente de cada miembro, como el apartado «Info» de WhatsApp.
-- Versión aplicada en Supabase: 20261122153511
create table if not exists public.member_profile_info (
  user_id uuid primary key references auth.users(id) on delete cascade,
  about_text text not null default '' check (char_length(about_text) <= 139),
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.member_profile_info enable row level security;
grant select on public.member_profile_info to anon;
grant select, insert, update, delete on public.member_profile_info to authenticated;

drop policy if exists "member_info_read_visible" on public.member_profile_info;
create policy "member_info_read_visible" on public.member_profile_info
  for select to anon, authenticated
  using (is_public = true or user_id = (select auth.uid()));

drop policy if exists "member_info_insert_own" on public.member_profile_info;
create policy "member_info_insert_own" on public.member_profile_info
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "member_info_update_own" on public.member_profile_info;
create policy "member_info_update_own" on public.member_profile_info
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "member_info_delete_own" on public.member_profile_info;
create policy "member_info_delete_own" on public.member_profile_info
  for delete to authenticated
  using (user_id = (select auth.uid()));
