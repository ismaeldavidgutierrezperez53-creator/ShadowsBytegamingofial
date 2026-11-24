-- Denegar explícitamente escrituras directas a medallas y premios.
-- La concesión pasa únicamente por la lógica de Supabase.
revoke all on public.sb_friend_weekly_medal_history from authenticated;
grant select on public.sb_friend_weekly_medal_history to authenticated;
revoke all on public.sb_monthly_community_post_prizes from authenticated;
grant select on public.sb_monthly_community_post_prizes to authenticated;
revoke all on public.sb_monthly_community_prize_seasons from authenticated;
grant select on public.sb_monthly_community_prize_seasons to authenticated;
