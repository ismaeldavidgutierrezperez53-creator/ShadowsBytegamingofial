
-- Roles del sitio: la cuenta administradora existente queda protegida como propietaria.
create table if not exists public.site_staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','moderator')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.site_staff_roles enable row level security;
revoke all on public.site_staff_roles from anon, authenticated;
grant select on public.site_staff_roles to authenticated;
grant all on public.site_staff_roles to service_role;
drop policy if exists site_staff_roles_self_read on public.site_staff_roles;
create policy site_staff_roles_self_read on public.site_staff_roles
for select to authenticated using (user_id = (select auth.uid()));

-- No se puede quitar el rango principal desde la web.
insert into public.site_staff_roles (user_id, role)
select id, 'owner' from auth.users
where raw_app_meta_data ->> 'role' = 'admin'
on conflict (user_id) do nothing;

create table if not exists public.site_staff_role_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  target_id uuid references auth.users(id) on delete set null,
  old_role text not null,
  new_role text not null,
  changed_at timestamptz not null default now()
);
alter table public.site_staff_role_audit enable row level security;
revoke all on public.site_staff_role_audit from anon, authenticated;
grant select on public.site_staff_role_audit to authenticated;
grant all on public.site_staff_role_audit to service_role;
drop policy if exists site_staff_role_audit_admin_read on public.site_staff_role_audit;
create policy site_staff_role_audit_admin_read on public.site_staff_role_audit
for select to authenticated using (
  exists (select 1 from public.site_staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin'))
);

-- Los moderadores gestionan publicaciones, comentarios y denuncias, no contenidos, tienda o roles.
drop policy if exists site_staff_posts_select on public.member_posts;
create policy site_staff_posts_select on public.member_posts
for select to authenticated using (
  exists (select 1 from public.site_staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','moderator'))
);
drop policy if exists site_staff_posts_delete on public.member_posts;
create policy site_staff_posts_delete on public.member_posts
for delete to authenticated using (
  exists (select 1 from public.site_staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','moderator'))
);
drop policy if exists site_staff_comments_select on public.member_comments;
create policy site_staff_comments_select on public.member_comments
for select to authenticated using (
  exists (select 1 from public.site_staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','moderator'))
);
drop policy if exists site_staff_comments_delete on public.member_comments;
create policy site_staff_comments_delete on public.member_comments
for delete to authenticated using (
  exists (select 1 from public.site_staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','moderator'))
);
drop policy if exists site_staff_reports_select on public.member_reports;
create policy site_staff_reports_select on public.member_reports
for select to authenticated using (
  exists (select 1 from public.site_staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','moderator'))
);
drop policy if exists site_staff_reports_update on public.member_reports;
create policy site_staff_reports_update on public.member_reports
for update to authenticated
using (exists (select 1 from public.site_staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','moderator')))
with check (exists (select 1 from public.site_staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','moderator')));
