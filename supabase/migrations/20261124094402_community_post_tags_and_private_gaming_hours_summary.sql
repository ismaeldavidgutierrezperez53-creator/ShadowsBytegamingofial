-- Etiquetas de publicaciones con un catálogo seguro (máximo tres).
alter table public.member_posts
 add column post_tags text[] not null default array[]::text[];
alter table public.member_posts
 add constraint member_posts_post_tags_allowed check (
  cardinality(post_tags) <= 3
  and array_position(post_tags, null) is null
  and post_tags <@ array[
   'Anime','Gaming','Manga','Manhwa','Fanart','Pokémon',
   'Preguntas','Spoiler','Torneos','Noticias'
  ]::text[]
 );

-- Resumen privado de horas gaming. SECURITY INVOKER respeta las RLS de las sesiones.
create view public.member_gaming_hours_private
with (security_invoker = true)
as
 select user_id,
        coalesce(sum(minutes_played),0)::bigint as total_minutes,
        count(*)::bigint as sessions_count
 from public.member_gaming_sessions
 group by user_id;
revoke all on public.member_gaming_hours_private from public, anon;
grant select on public.member_gaming_hours_private to authenticated;
