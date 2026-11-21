-- View analytics function; visitors are counted once per content. Madrid local buckets.
CREATE OR REPLACE FUNCTION public.content_view_analytics(p_kind text, p_content_id uuid, p_period text DEFAULT 'day'::text)
 RETURNS TABLE(bucket_start date, views bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 viewer_id uuid := (select auth.uid());
 allowed boolean := false;
 step_size interval;
 bucket_count int;
 first_bucket timestamp;
begin
 if viewer_id is null or p_content_id is null
    or p_kind is null or p_kind not in ('post','news')
    or p_period is null or p_period not in ('day','week','month') then
  raise exception 'Parámetros o sesión no válidos' using errcode = '42501';
 end if;

 if p_kind = 'post' then
  select exists (
   select 1 from public.member_posts p
   where p.id=p_content_id and p.author_id=viewer_id
  ) into allowed;
 else
  select exists (
   select 1 from public.news n
   where n.id=p_content_id and (
    n.author_id=viewer_id
    or (auth.jwt() -> 'app_metadata' ->> 'role')='admin'
    or exists (
     select 1 from public.site_staff_roles s
     where s.user_id=viewer_id and s.role in ('owner','admin')
    )
   )
  ) into allowed;
 end if;
 if not allowed then
  raise exception 'No tienes permiso para consultar estas estadísticas' using errcode = '42501';
 end if;

 bucket_count := case when p_period='day' then 14 else 12 end;
 step_size := case p_period
  when 'day' then interval '1 day'
  when 'week' then interval '1 week'
  else interval '1 month'
 end;
 first_bucket := date_trunc(p_period,now() at time zone 'Europe/Madrid')
                 - (bucket_count-1)*step_size;

 return query
 with buckets as (
  select (first_bucket + i*step_size)::date as d
  from generate_series(0,bucket_count-1) as s(i)
 ),
 events as (
  select v.created_at as seen_at
  from public.member_post_visitors v
  where p_kind='post' and v.post_id=p_content_id
        and v.created_at >= (first_bucket at time zone 'Europe/Madrid')
  union all
  select v.created_at as seen_at
  from public.news_article_visitors v
  where p_kind='news' and v.news_id=p_content_id
        and v.created_at >= (first_bucket at time zone 'Europe/Madrid')
 )
 select b.d, count(e.seen_at)::bigint
 from buckets b
 left join events e
   on date_trunc(p_period,e.seen_at at time zone 'Europe/Madrid')::date=b.d
 group by b.d
 order by b.d;
end
$function$


revoke all on function public.content_view_analytics(text,uuid,text) from public, anon, authenticated;
grant execute on function public.content_view_analytics(text,uuid,text) to authenticated;
comment on function public.content_view_analytics(text,uuid,text) is 'Author-only daily, weekly and monthly unique visitors in Madrid time';
