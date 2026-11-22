-- Private cross-content analytics for own posts and author/manager news.
CREATE OR REPLACE FUNCTION public.content_view_overview(p_period text DEFAULT 'day'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 viewer_id uuid := (select auth.uid());
 can_manage_news boolean := false;
 bucket_count int;
 step_size interval;
 first_bucket timestamp;
 overview jsonb;
begin
 if viewer_id is null then
  raise exception 'Debes iniciar sesion para consultar las estadisticas' using errcode='42501';
 end if;
 if p_period is null or p_period not in ('day','week','month') then
  raise exception 'Periodo no valido' using errcode='22023';
 end if;

 can_manage_news :=
  coalesce(auth.jwt()->'app_metadata'->>'role'='admin',false)
  or exists (
   select 1 from public.site_staff_roles sr
   where sr.user_id=viewer_id and sr.role in ('owner','admin')
  );

 bucket_count:=case when p_period='day' then 14 else 12 end;
 step_size:=case p_period when 'day' then interval '1 day'
                           when 'week' then interval '1 week'
                           else interval '1 month' end;
 first_bucket:=date_trunc(p_period,now() at time zone 'Europe/Madrid')
                -(bucket_count-1)*step_size;

 with authorized_news as (
  select n.id,n.title,n.published_at
  from public.news n
  where n.status='published' and n.published_at<=now()
    and (n.author_id=viewer_id or can_manage_news)
 ), authorized_posts as (
  select p.id,p.content,p.created_at
  from public.member_posts p
  where p.author_id=viewer_id
 ), content_items as (
  select 'news'::text as kind,n.id as content_id,
   coalesce(nullif(left(n.title,110),''),'Noticia sin titulo') as title,
   n.published_at as item_date,
   (select count(*) from public.news_article_visitors nv
      where nv.news_id=n.id) as views
  from authorized_news n
  union all
  select 'post'::text,p.id,
   coalesce(nullif(left(replace(p.content,'||',''),110),''),'Publicacion sin texto'),
   p.created_at,
   (select count(*) from public.member_post_visitors pv
      where pv.post_id=p.id)
  from authorized_posts p
 ), summary as (
  select count(*) filter(where kind='news') as news_count,
   count(*) filter(where kind='post') as post_count,
   coalesce(sum(views) filter(where kind='news'),0) as news_views,
   coalesce(sum(views) filter(where kind='post'),0) as post_views,
   coalesce(sum(views),0) as total_views
  from content_items
 ), dates as (
  select (first_bucket+i*step_size)::date as bucket_start
  from generate_series(0,bucket_count-1) as g(i)
 ), events as (
  select 'news'::text as kind,v.created_at as seen_at
  from authorized_news n join public.news_article_visitors v on v.news_id=n.id
  where v.created_at >= first_bucket at time zone 'Europe/Madrid'
  union all
  select 'post'::text,v.created_at
  from authorized_posts p join public.member_post_visitors v on v.post_id=p.id
  where v.created_at >= first_bucket at time zone 'Europe/Madrid'
 ), trend as (
  select d.bucket_start,
   count(e.seen_at) filter(where e.kind='news') as news_views,
   count(e.seen_at) filter(where e.kind='post') as post_views
  from dates d left join events e
    on date_trunc(p_period,e.seen_at at time zone 'Europe/Madrid')::date=d.bucket_start
  group by d.bucket_start
 ), ranked as (
  select kind,content_id,title,views,item_date
  from content_items
  order by views desc,item_date desc nulls last
  limit 10
 )
 select jsonb_build_object(
  'summary',jsonb_build_object(
    'news_count',s.news_count,'post_count',s.post_count,
    'news_views',s.news_views,'post_views',s.post_views,
    'total_views',s.total_views
  ),
  'trend',coalesce((
   select jsonb_agg(jsonb_build_object(
     'bucket_start',t.bucket_start,
     'news_views',t.news_views,'post_views',t.post_views
   ) order by t.bucket_start) from trend t
  ),'[]'::jsonb),
  'top',coalesce((
   select jsonb_agg(jsonb_build_object(
     'kind',r.kind,'content_id',r.content_id,'title',r.title,
     'views',r.views,'item_date',r.item_date
   ) order by r.views desc,r.item_date desc nulls last)
   from ranked r
  ),'[]'::jsonb)
 ) into overview
 from summary s;
 return overview;
end
$function$


revoke all on function public.content_view_overview(text) from public,anon,authenticated;
grant execute on function public.content_view_overview(text) to authenticated;
comment on function public.content_view_overview(text) is 'Private news and post totals, top ten and trend by day week or month';
