-- Lista privada de etiquetas que el usuario ha conseguido y puede destacar.
create or replace function public.sb_get_my_eligible_featured_tags()
returns table(tag_id uuid,label text,emoji text,color text,animation text,source text)
language plpgsql stable security definer set search_path='' as $fn$
declare uid uuid:=(select auth.uid());
begin
 if uid is null then return;end if;
 return query
 select c.id,c.label,c.emoji,c.color,c.animation,'admin'::text
 from public.sb_exclusive_tag_assignments a
 join public.sb_exclusive_tag_catalog c on c.id=a.tag_id
 where a.user_id=uid
 union all
 select c.id,c.label,c.emoji,c.color,c.animation,'automatic'::text
 from public.get_member_auto_exclusive_progress(array[uid]) p
 join public.sb_exclusive_tag_catalog c on c.id=p.tag_id
 where p.unlocked and not exists(
  select 1 from public.sb_exclusive_tag_assignments a
  where a.user_id=uid and a.tag_id=c.id
 );
end $fn$;
revoke all on function public.sb_get_my_eligible_featured_tags() from public,anon,authenticated;
grant execute on function public.sb_get_my_eligible_featured_tags() to authenticated,service_role;