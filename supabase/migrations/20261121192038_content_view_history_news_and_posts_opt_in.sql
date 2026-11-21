-- Applied to Supabase as migration 20261121192038.

-- Opt-in history: anonymous counts are separate from named member visits.
create table if not exists public.member_content_view_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists public.member_post_visitors (
 post_id uuid not null references public.member_posts(id) on delete cascade,
 visitor_id uuid not null,
 created_at timestamptz not null default now(),
 primary key (post_id, visitor_id)
);
create table if not exists public.member_post_views (
 post_id uuid not null references public.member_posts(id) on delete cascade,
 viewer_id uuid not null references auth.users(id) on delete cascade,
 viewed_at timestamptz not null default now(),
 primary key (post_id, viewer_id)
);
create table if not exists public.news_member_views (
 news_id uuid not null references public.news(id) on delete cascade,
 viewer_id uuid not null references auth.users(id) on delete cascade,
 viewed_at timestamptz not null default now(),
 primary key (news_id, viewer_id)
);
create index if not exists member_post_views_recent_idx on public.member_post_views(post_id, viewed_at desc);
create index if not exists news_member_views_recent_idx on public.news_member_views(news_id, viewed_at desc);
create index if not exists member_post_views_viewer_idx on public.member_post_views(viewer_id);
create index if not exists news_member_views_viewer_idx on public.news_member_views(viewer_id);

alter table public.member_content_view_settings enable row level security;
alter table public.member_post_visitors enable row level security;
alter table public.member_post_views enable row level security;
alter table public.news_member_views enable row level security;

revoke all on public.member_content_view_settings, public.member_post_visitors, public.member_post_views, public.news_member_views from anon, authenticated;
grant select on public.member_content_view_settings to authenticated;
grant select on public.member_post_views, public.news_member_views to authenticated;

create policy "content_view_settings_owner_read" on public.member_content_view_settings
 for select to authenticated using (user_id = (select auth.uid()));
create policy "content_post_views_author_read" on public.member_post_views
 for select to authenticated using (
  exists(select 1 from public.member_posts p where p.id=post_id and p.author_id=(select auth.uid()))
 );
create policy "content_news_views_author_or_admin_read" on public.news_member_views
 for select to authenticated using (
  exists(
   select 1 from public.news n
   where n.id=news_id and
    (n.author_id=(select auth.uid()) or
     (select auth.jwt()->'app_metadata'->>'role')='admin' or
     exists(select 1 from public.site_staff_roles sr
       where sr.user_id=(select auth.uid()) and sr.role in ('owner','admin')))
  )
 );

-- Only an explicitly enabled member leaves an identifiable view.
create or replace function public.content_set_view_history(p_enabled boolean)
returns boolean language plpgsql security definer set search_path to ''
as $$
declare v uuid := auth.uid();
begin
 if v is null or p_enabled is null then raise exception 'Inicia sesión para cambiar esta opción'; end if;
 insert into public.member_content_view_settings(user_id,enabled,updated_at)
 values(v,p_enabled,now())
 on conflict(user_id) do update set enabled=excluded.enabled,updated_at=excluded.updated_at;
 if not p_enabled then
  delete from public.member_post_views where viewer_id=v;
  delete from public.news_member_views where viewer_id=v;
 end if;
 return p_enabled;
end;
$$;

create or replace function public.content_record_post_view(p_post_id uuid,p_visitor_id uuid)
returns bigint language plpgsql security definer set search_path to ''
as $$
declare
 v uuid := auth.uid();
 owner_id uuid;
 total bigint := 0;
begin
 if p_post_id is null or p_visitor_id is null then return 0; end if;
 select p.author_id into owner_id
 from public.member_posts p join public.profiles pr on pr.id=p.author_id
 where p.id=p_post_id and pr.is_public=true;
 if owner_id is null then return 0; end if;
 -- Authors do not increase their own publication's view count.
 if v is distinct from owner_id then
  insert into public.member_post_visitors(post_id,visitor_id)
  values(p_post_id,p_visitor_id)
  on conflict do nothing;
  if v is not null and exists(select 1 from public.member_content_view_settings s where s.user_id=v and s.enabled) then
   insert into public.member_post_views(post_id,viewer_id,viewed_at)
   values(p_post_id,v,now())
   on conflict(post_id,viewer_id) do update set viewed_at=excluded.viewed_at;
  end if;
 end if;
 select count(*) into total from public.member_post_visitors where post_id=p_post_id;
 return total;
end;
$$;

-- Preserve the existing unique-news-view RPC and add consensual named history.
create or replace function public.news_record_view(p_news_id uuid, p_visitor_id uuid)
returns bigint language plpgsql security definer set search_path to ''
as $$
declare
 result_count bigint;
 owner_id uuid;
 viewer uuid := auth.uid();
begin
 if p_news_id is null or p_visitor_id is null then return 0; end if;
 select author_id into owner_id from public.news
 where id=p_news_id and status='published' and published_at<=now();
 if not found then return 0; end if;
 insert into public.news_article_visitors(news_id,visitor_id)
 values(p_news_id,p_visitor_id)
 on conflict(news_id,visitor_id) do nothing;
 if viewer is not null and viewer is distinct from owner_id
    and exists(select 1 from public.member_content_view_settings s where s.user_id=viewer and s.enabled) then
  insert into public.news_member_views(news_id,viewer_id,viewed_at)
  values(p_news_id,viewer,now())
  on conflict(news_id,viewer_id) do update set viewed_at=excluded.viewed_at;
 end if;
 select count(*) into result_count from public.news_article_visitors where news_id=p_news_id;
 return result_count;
end;
$$;

create or replace function public.content_post_view_counts(p_ids uuid[])
returns table(post_id uuid, views bigint)
language sql stable security definer set search_path to ''
as $$
 select p.id, (select count(*) from public.member_post_visitors v where v.post_id=p.id)
 from public.member_posts p join public.profiles pr on pr.id=p.author_id
 where p.id=any(p_ids) and pr.is_public=true
 and coalesce(cardinality(p_ids),0) between 1 and 100
$$;

create or replace function public.content_news_view_counts(p_ids uuid[])
returns table(news_id uuid, views bigint)
language sql stable security definer set search_path to ''
as $$
 select n.id, (select count(*) from public.news_article_visitors v where v.news_id=n.id)
 from public.news n
 where n.id=any(p_ids) and n.status='published' and n.published_at<=now()
 and coalesce(cardinality(p_ids),0) between 1 and 100
$$;

revoke all on function public.content_set_view_history(boolean) from public, anon, authenticated;
grant execute on function public.content_set_view_history(boolean) to authenticated;
revoke all on function public.content_record_post_view(uuid,uuid) from public, anon, authenticated;
grant execute on function public.content_record_post_view(uuid,uuid) to anon, authenticated;
revoke all on function public.content_post_view_counts(uuid[]) from public, anon, authenticated;
grant execute on function public.content_post_view_counts(uuid[]) to anon, authenticated;
revoke all on function public.content_news_view_counts(uuid[]) from public, anon, authenticated;
grant execute on function public.content_news_view_counts(uuid[]) to anon, authenticated;
-- The pre-existing public news counter must remain callable by visitors.
grant execute on function public.news_record_view(uuid,uuid) to anon, authenticated;
