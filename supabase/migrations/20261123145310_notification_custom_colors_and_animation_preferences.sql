-- Colores y animaciones configurables por usuario. Se conserva RLS existente de preferencias.
alter table public.member_notification_preferences
 add column if not exists notification_theme_colors jsonb not null default '{"community":"#ad8df3","followers":"#78bde4","tournaments":"#70cbd5","polls":"#9ccb8e","rewards":"#f1c477","messages":"#82a6f3","news":"#e6a7d6","pinned":"#e7ba70","priority":"#f19d79"}'::jsonb;
alter table public.member_notification_preferences
 add column if not exists notification_animations_enabled boolean not null default true;
alter table public.member_notification_preferences
 add constraint sb_notification_theme_valid check (
  jsonb_typeof(notification_theme_colors) = 'object'
  and notification_theme_colors ?& array['community','followers','tournaments','polls','rewards','messages','news','pinned','priority']
  and (notification_theme_colors - 'community' - 'followers' - 'tournaments' - 'polls' - 'rewards' - 'messages' - 'news' - 'pinned' - 'priority') = '{}'::jsonb
  and (notification_theme_colors->>'community') ~ '^#[0-9A-Fa-f]{6}$'
  and (notification_theme_colors->>'followers') ~ '^#[0-9A-Fa-f]{6}$'
  and (notification_theme_colors->>'tournaments') ~ '^#[0-9A-Fa-f]{6}$'
  and (notification_theme_colors->>'polls') ~ '^#[0-9A-Fa-f]{6}$'
  and (notification_theme_colors->>'rewards') ~ '^#[0-9A-Fa-f]{6}$'
  and (notification_theme_colors->>'messages') ~ '^#[0-9A-Fa-f]{6}$'
  and (notification_theme_colors->>'news') ~ '^#[0-9A-Fa-f]{6}$'
  and (notification_theme_colors->>'pinned') ~ '^#[0-9A-Fa-f]{6}$'
  and (notification_theme_colors->>'priority') ~ '^#[0-9A-Fa-f]{6}$'
);
