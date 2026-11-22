-- Preferencias personales de avisos externos y ventanas emergentes.
-- Valor TRUE por defecto para conservar el comportamiento existente.
-- La RLS ya existente de member_notification_preferences limita el acceso a cada miembro.
alter table public.member_notification_preferences
  add column if not exists alert_community_enabled boolean not null default true;
alter table public.member_notification_preferences
  add column if not exists alert_followers_enabled boolean not null default true;
alter table public.member_notification_preferences
  add column if not exists alert_tournaments_enabled boolean not null default true;
alter table public.member_notification_preferences
  add column if not exists alert_polls_enabled boolean not null default true;
alter table public.member_notification_preferences
  add column if not exists alert_rewards_enabled boolean not null default true;
alter table public.member_notification_preferences
  add column if not exists alert_messages_enabled boolean not null default true;
alter table public.member_notification_preferences
  add column if not exists alert_news_enabled boolean not null default true;
