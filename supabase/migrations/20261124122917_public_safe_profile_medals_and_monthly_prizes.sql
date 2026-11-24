-- Insignias públicas, nunca horas de juego ni información del rival.
grant select(id,recipient_id,week_start,medal_kind,awarded_at)
 on public.sb_profile_gaming_medals to anon;
drop policy sb_profile_gaming_medal_public_read on public.sb_profile_gaming_medals;
create policy sb_profile_gaming_medal_public_read on public.sb_profile_gaming_medals
 for select to anon,authenticated using(
  exists(select 1 from public.profiles p
    where p.id=recipient_id and p.is_public=true)
 );

-- Los premios mensuales confirmados pueden verse en perfiles públicos.
grant select(month_start,place,post_id,author_id,score,awarded_at)
 on public.sb_monthly_community_post_prizes to anon;
create policy sb_monthly_community_prize_anon_public_read
 on public.sb_monthly_community_post_prizes
 for select to anon using(
  exists(select 1 from public.profiles p
   where p.id=author_id and p.is_public=true)
 );
