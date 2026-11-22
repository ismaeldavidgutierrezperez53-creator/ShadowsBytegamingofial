-- Etiquetas personales por grupo, sin conceder privilegios.
create table if not exists public.member_chat_group_labels (
 group_id uuid not null,
 user_id uuid not null,
 label text not null default '',
 updated_at timestamptz not null default now(),
 constraint member_chat_group_labels_pkey primary key (group_id, user_id),
 constraint member_chat_group_labels_member_fkey foreign key (group_id, user_id)
  references public.member_chat_group_members (group_id, user_id) on delete cascade,
 constraint member_chat_group_labels_text_check check (
  char_length(label) <= 30 and label = btrim(label)
  and label !~ '[[:cntrl:]]' and label !~* '(https?://|www[.])'
 )
);
alter table public.member_chat_group_labels enable row level security;
revoke all on public.member_chat_group_labels from public, anon;
grant select, insert, update on public.member_chat_group_labels to authenticated;
grant all on public.member_chat_group_labels to service_role;
create policy "group_labels_read_members" on public.member_chat_group_labels
 for select to authenticated using (public.is_member_chat_group(group_id, (select auth.uid())));
create policy "group_labels_insert_own" on public.member_chat_group_labels
 for insert to authenticated with check (
  user_id = (select auth.uid()) and public.is_member_chat_group(group_id, (select auth.uid()))
 );
create policy "group_labels_update_own" on public.member_chat_group_labels
 for update to authenticated using (
  user_id = (select auth.uid()) and public.is_member_chat_group(group_id, (select auth.uid()))
 ) with check (
  user_id = (select auth.uid()) and public.is_member_chat_group(group_id, (select auth.uid()))
 );
do $$ begin
 if exists (select 1 from pg_publication where pubname='supabase_realtime')
  and not exists (select 1 from pg_publication_tables where pubname='supabase_realtime'
   and schemaname='public' and tablename='member_chat_group_labels') then
  alter publication supabase_realtime add table public.member_chat_group_labels;
 end if;
end $$;