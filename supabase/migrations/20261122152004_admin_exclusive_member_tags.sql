-- Distintivos otorgados por administración, independientes de los permisos.
create table if not exists public.sb_exclusive_tag_catalog (
 id uuid primary key default gen_random_uuid(),
 label text not null unique,
 emoji text not null default '⭐',
 color text not null default 'purple',
 is_system boolean not null default false,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 constraint sb_exclusive_tag_catalog_label_check check (
  char_length(label) between 2 and 30 and label=btrim(label)
  and label !~ '[[:cntrl:]]' and label !~* '(https?://|www[.])'
 ),
 constraint sb_exclusive_tag_catalog_emoji_check check (
  emoji in ('👑','⭐','🛡️','💜','🌸','🎮','🏆','🔥','🐉','✨','💎','🎨','🎧')
 ),
 constraint sb_exclusive_tag_catalog_color_check check (
  color in ('purple','blue','pink','green','orange','gold','slate')
 )
);
create table if not exists public.sb_exclusive_tag_assignments (
 tag_id uuid not null references public.sb_exclusive_tag_catalog(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 granted_by uuid references auth.users(id) on delete set null,
 granted_at timestamptz not null default now(),
 primary key (tag_id,user_id)
);
create index if not exists sb_exclusive_tag_assignments_user_idx
 on public.sb_exclusive_tag_assignments(user_id);
alter table public.sb_exclusive_tag_catalog enable row level security;
alter table public.sb_exclusive_tag_assignments enable row level security;
revoke all on public.sb_exclusive_tag_catalog from public,anon,authenticated;
revoke all on public.sb_exclusive_tag_assignments from public,anon,authenticated;
grant select on public.sb_exclusive_tag_catalog to anon,authenticated;
grant select on public.sb_exclusive_tag_assignments to anon,authenticated;
grant insert,delete on public.sb_exclusive_tag_catalog to authenticated;
grant insert,delete on public.sb_exclusive_tag_assignments to authenticated;
grant all on public.sb_exclusive_tag_catalog to service_role;
grant all on public.sb_exclusive_tag_assignments to service_role;
create policy sb_exclusive_catalog_read on public.sb_exclusive_tag_catalog
 for select to anon,authenticated using (true);
create policy sb_exclusive_catalog_create_admin on public.sb_exclusive_tag_catalog
 for insert to authenticated with check (
 is_system=false and created_by=(select auth.uid())
 and exists(select 1 from public.site_staff_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));
create policy sb_exclusive_catalog_delete_admin on public.sb_exclusive_tag_catalog
 for delete to authenticated using (is_system=false
 and exists(select 1 from public.site_staff_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));
create policy sb_exclusive_assignments_read on public.sb_exclusive_tag_assignments
 for select to anon,authenticated using (
 exists(select 1 from public.profiles p where p.id=user_id and p.is_public));
create policy sb_exclusive_assignments_grant_admin on public.sb_exclusive_tag_assignments
 for insert to authenticated with check (granted_by=(select auth.uid())
 and exists(select 1 from public.site_staff_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));
create policy sb_exclusive_assignments_revoke_admin on public.sb_exclusive_tag_assignments
 for delete to authenticated using (
 exists(select 1 from public.site_staff_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));
insert into public.sb_exclusive_tag_catalog(label,emoji,color,is_system)
values ('VIP','👑','gold',true),('Colaborador','⭐','blue',true),('Moderador','🛡️','green',true)
on conflict (label) do nothing;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
  and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
    and schemaname='public' and tablename='sb_exclusive_tag_assignments') then
  alter publication supabase_realtime add table public.sb_exclusive_tag_assignments;
 end if;
end $$;