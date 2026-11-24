-- Incorporar nuevas insignias a la bandeja e historial de notificaciones.
-- Mantener todas las ramas previas de la vista existentes.
create or replace view public.member_notification_history_core as
SELECT n.id::text AS record_id,
        CASE
            WHEN n.kind = 'info_reaction'::text THEN 'community'::text
            WHEN n.kind = 'follow'::text THEN 'followers'::text
            WHEN n.kind = ANY (ARRAY['poll'::text, 'poll_reminder'::text, 'poll_season_prize'::text, 'poll_trophy_like'::text, 'poll_museum_prize'::text]) THEN 'polls'::text
            WHEN n.kind = ANY (ARRAY['tournament_full'::text, 'tournament_match'::text, 'tournament_finished'::text]) THEN 'tournaments'::text
            WHEN n.kind = 'profile_view'::text THEN 'visits'::text
            WHEN n.kind = 'exclusive_tag_unlock'::text THEN 'achievements'::text
            WHEN n.kind = 'gift'::text THEN 'shop'::text
            WHEN n.kind = 'news_reply'::text THEN 'news'::text
            ELSE 'community'::text
        END AS category,
    n.kind,
        CASE n.kind
            WHEN 'info_reaction'::text THEN '💜 Han reaccionado a tu Info'::text
            WHEN 'follow'::text THEN '👥 Nuevo seguidor'::text
            WHEN 'like'::text THEN '❤️ Me gusta en tu publicación'::text
            WHEN 'comment'::text THEN '💬 Nuevo comentario'::text
            WHEN 'exclusive_tag_unlock'::text THEN '🏅 Nueva etiqueta exclusiva desbloqueada'::text
            WHEN 'gift'::text THEN '🎁 Has recibido un regalo'::text
            WHEN 'game_like'::text THEN '🎮 Me gusta en tu videojuego'::text
            WHEN 'game_comment'::text THEN '💬 Comentario en tu videojuego'::text
            WHEN 'game_reply'::text THEN '↩️ Respuesta en tu biblioteca gamer'::text
            WHEN 'profile_view'::text THEN '👤 Alguien visitó tu perfil'::text
            WHEN 'poll'::text THEN '📊 Nueva encuesta'::text
            WHEN 'poll_reminder'::text THEN '⏰ Recordatorio de encuesta'::text
            WHEN 'poll_season_prize'::text THEN '🏆 Premio de temporada de encuestas'::text
            WHEN 'poll_trophy_like'::text THEN '❤️ Me gusta en tu trofeo'::text
            WHEN 'poll_museum_prize'::text THEN '🏛️ Premio mensual de museo'::text
            WHEN 'news_reply'::text THEN '📰 Respuesta a tu comentario en noticias'::text
            WHEN 'tournament_full'::text THEN '🎟️ Torneo completo'::text
            WHEN 'tournament_match'::text THEN '⚔️ Nuevo enfrentamiento'::text
            WHEN 'tournament_finished'::text THEN '🏆 Torneo finalizado'::text
            ELSE '🔔 Nueva actividad en tu comunidad'::text
        END AS title,
        CASE
            WHEN n.kind = 'info_reaction'::text THEN '#/perfil?id='::text || n.recipient_id::text
            WHEN n.kind = 'follow'::text THEN '#/perfil?id='::text || n.actor_id::text
            WHEN n.kind = 'news_reply'::text AND n.news_id IS NOT NULL THEN '#/noticia?id='::text || n.news_id::text
            WHEN (n.kind = ANY (ARRAY['tournament_full'::text, 'tournament_match'::text, 'tournament_finished'::text])) AND n.tournament_id IS NOT NULL THEN '#/tienda?tournament='::text || replace(n.tournament_id, ' '::text, '%20'::text)
            WHEN (n.kind = ANY (ARRAY['poll'::text, 'poll_reminder'::text])) AND n.poll_id IS NOT NULL THEN '#/encuestas?poll='::text || n.poll_id::text
            WHEN n.kind = 'exclusive_tag_unlock'::text THEN '#/cuenta'::text
            WHEN n.kind = 'gift'::text THEN '#/regalos'::text
            WHEN (n.kind = ANY (ARRAY['game_like'::text, 'game_comment'::text, 'game_reply'::text])) AND n.game_id IS NOT NULL THEN (('#/perfil?id='::text || n.recipient_id::text) || '&game='::text) || n.game_id::text
            ELSE '#/notificaciones'::text
        END AS href,
    n.created_at AS occurred_at,
    n.is_read,
    n.dismissed_at AS archived_at,
    'member_notifications'::text AS source_table
   FROM member_notifications n
  WHERE n.recipient_id = (( SELECT auth.uid() AS uid))
UNION ALL
 SELECT r.id::text AS record_id,
    'reports'::text AS category,
    'report'::text AS kind,
    '🛡️ Tu denuncia fue '::text ||
        CASE
            WHEN r.status = 'reviewed'::text THEN 'revisada'::text
            ELSE 'actualizada'::text
        END AS title,
    '#/cuenta'::text AS href,
    r.created_at AS occurred_at,
    r.is_read,
    r.dismissed_at AS archived_at,
    'member_report_notifications'::text AS source_table
   FROM member_report_notifications r
  WHERE r.recipient_id = (( SELECT auth.uid() AS uid))
UNION ALL
 SELECT m.id::text AS record_id,
    'messages'::text AS category,
    'direct_message'::text AS kind,
    '💬 Mensaje privado recibido'::text AS title,
    '#/mensajes?id='::text || m.sender_id::text AS href,
    m.created_at AS occurred_at,
    m.is_read,
    NULL::timestamp with time zone AS archived_at,
    'member_direct_messages'::text AS source_table
   FROM member_direct_messages m
  WHERE m.recipient_id = (( SELECT auth.uid() AS uid)) AND m.deleted_at IS NULL
UNION ALL
 SELECT g.id::text AS record_id,
    'messages'::text AS category,
    'group_message'::text AS kind,
    '👥 Mensaje recibido en un grupo'::text AS title,
    '#/mensajes'::text AS href,
    g.created_at AS occurred_at,
    true AS is_read,
    NULL::timestamp with time zone AS archived_at,
    'member_chat_group_messages'::text AS source_table
   FROM member_chat_group_messages g
     JOIN member_chat_group_members gm ON gm.group_id = g.group_id AND gm.user_id = (( SELECT auth.uid() AS uid))
  WHERE g.sender_id <> (( SELECT auth.uid() AS uid)) AND g.deleted_at IS NULL AND COALESCE(g.view_once, false) = false
UNION ALL
 SELECT c.id::text AS record_id,
    'calls'::text AS category,
    'private_call'::text AS kind,
    ('📞 Llamada '::text ||
        CASE
            WHEN c.kind = 'video'::text THEN 'de vídeo'::text
            ELSE 'de voz'::text
        END) || ' recibida'::text AS title,
    '#/mensajes'::text AS href,
    c.created_at AS occurred_at,
    true AS is_read,
    NULL::timestamp with time zone AS archived_at,
    'member_private_calls'::text AS source_table
   FROM member_private_calls c
  WHERE c.callee_id = (( SELECT auth.uid() AS uid))
UNION ALL
 SELECT c.id::text AS record_id,
    'calls'::text AS category,
    'group_call'::text AS kind,
    '👥 Llamada grupal recibida'::text AS title,
    '#/mensajes'::text AS href,
    c.created_at AS occurred_at,
    true AS is_read,
    NULL::timestamp with time zone AS archived_at,
    'member_group_calls'::text AS source_table
   FROM member_group_calls c
  WHERE c.callee_id = (( SELECT auth.uid() AS uid))
UNION ALL
 SELECT i.id::text AS record_id,
    'calls'::text AS category,
    'video_invite'::text AS kind,
    '📹 Invitación a videollamada grupal'::text AS title,
    '#/mensajes'::text AS href,
    i.created_at AS occurred_at,
    i.response <> 'pending'::text AS is_read,
    NULL::timestamp with time zone AS archived_at,
    'member_group_video_invites'::text AS source_table
   FROM member_group_video_invites i
  WHERE i.invitee_id = (( SELECT auth.uid() AS uid))
UNION ALL
 SELECT (b.user_id::text || ':'::text) || b.badge_key AS record_id,
    'achievements'::text AS category,
    'gamer_badge'::text AS kind,
    '🏅 Insignia gamer: '::text || "left"(b.badge_key, 90) AS title,
    '#/cuenta'::text AS href,
    b.created_at AS occurred_at,
    b.read_at IS NOT NULL AS is_read,
    NULL::timestamp with time zone AS archived_at,
    'member_gamer_badge_notifications'::text AS source_table
   FROM member_gamer_badge_notifications b
  WHERE b.user_id = (( SELECT auth.uid() AS uid))
UNION ALL
 SELECT (g.goal_id::text || ':'::text) || g.milestone::text AS record_id,
    'achievements'::text AS category,
    'point_goal'::text AS kind,
    ('🎯 Meta de puntos: '::text || g.milestone::text) || '% alcanzado'::text AS title,
    '#/cuenta'::text AS href,
    g.created_at AS occurred_at,
    g.read_at IS NOT NULL AS is_read,
    NULL::timestamp with time zone AS archived_at,
    'member_point_goal_notifications'::text AS source_table
   FROM member_point_goal_notifications g
  WHERE g.user_id = (( SELECT auth.uid() AS uid))
UNION ALL
 SELECT (a.user_id::text || ':'::text) || a.level::text AS record_id,
    'achievements'::text AS category,
    'level_award'::text AS kind,
    '🌟 Premio por alcanzar nivel '::text || a.level::text AS title,
    '#/cuenta'::text AS href,
    a.awarded_at AS occurred_at,
    true AS is_read,
    NULL::timestamp with time zone AS archived_at,
    'member_milestone_awards'::text AS source_table
   FROM member_milestone_awards a
  WHERE a.user_id = (( SELECT auth.uid() AS uid))
UNION ALL
 SELECT (a.user_id::text || ':'::text) || a.milestone::text AS record_id,
    'polls'::text AS category,
    'poll_milestone'::text AS kind,
    ('📊 Premio por '::text || a.milestone::text) || ' encuestas'::text AS title,
    '#/encuestas'::text AS href,
    a.awarded_at AS occurred_at,
    true AS is_read,
    NULL::timestamp with time zone AS archived_at,
    'member_poll_milestone_awards'::text AS source_table
   FROM member_poll_milestone_awards a
  WHERE a.user_id = (( SELECT auth.uid() AS uid))
UNION ALL
 SELECT (a.competition_id::text || ':'::text) || a.user_id::text AS record_id,
    'tournaments'::text AS category,
    'competition_award'::text AS kind,
    '🏆 Premio de competición: '::text || "left"(a.badge, 70) AS title,
    '#/comunidad'::text AS href,
    a.awarded_at AS occurred_at,
    true AS is_read,
    NULL::timestamp with time zone AS archived_at,
    'community_competition_awards'::text AS source_table
   FROM community_competition_awards a
  WHERE a.user_id = (( SELECT auth.uid() AS uid))
UNION ALL
 SELECT (a.month_start::text || ':'::text) || a.user_id::text AS record_id,
    'shop'::text AS category,
    'mystery_box_award'::text AS kind,
    '🎁 Premio mensual de cajas: '::text || "left"(a.badge, 70) AS title,
    '#/tienda'::text AS href,
    a.awarded_at AS occurred_at,
    true AS is_read,
    NULL::timestamp with time zone AS archived_at,
    'mystery_box_monthly_awards'::text AS source_table
   FROM mystery_box_monthly_awards a
  WHERE a.user_id = (( SELECT auth.uid() AS uid))
UNION ALL
 SELECT (a.event_id || ':'::text) || a.user_id::text AS record_id,
    'shop'::text AS category,
    'shop_season_award'::text AS kind,
    '🏆 Premio de temporada de tienda'::text AS title,
    '#/tienda'::text AS href,
    a.awarded_at AS occurred_at,
    true AS is_read,
    NULL::timestamp with time zone AS archived_at,
    'shop_season_podium_awards'::text AS source_table
   FROM shop_season_podium_awards a
  WHERE a.user_id = (( SELECT auth.uid() AS uid))
UNION ALL
 SELECT n.id::text AS record_id,
    'news'::text AS category,
    'published_news'::text AS kind,
    '📰 '::text || "left"(n.title, 150) AS title,
    '#/noticia?id='::text || n.id::text AS href,
    n.published_at AS occurred_at,
    true AS is_read,
    NULL::timestamp with time zone AS archived_at,
    'news'::text AS source_table
   FROM news n
  WHERE n.status = 'published'::text AND n.published_at <= now()
UNION ALL
select (n.user_id::text || ':' || n.badge_key)::text as record_id,
  'achievements'::text as category,
  'community_reaction_badge'::text as kind,
  (c.emoji || ' Insignia desbloqueada: ' || c.title)::text as title,
  '#/logros'::text as href,
  n.created_at as occurred_at,
  (n.read_at is not null) as is_read,
  null::timestamptz as archived_at,
  'member_community_reaction_badge_notifications'::text as source_table
from public.member_community_reaction_badge_notifications n
join public.member_community_reaction_badge_catalog c on c.badge_key=n.badge_key
where n.user_id=(select auth.uid());
