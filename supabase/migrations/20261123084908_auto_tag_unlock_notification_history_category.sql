-- Añadir los desbloqueos a la categoría Logros del historial existente,
-- conservando las demás fuentes y columnas de la vista unificada.
do $do$
declare view_sql text;
begin
 select pg_get_viewdef('public.member_notification_history_core'::regclass,true)
 into view_sql;
 if position('WHEN n.kind = ''gift''::text THEN ''shop''::text' in view_sql)=0
   or position('WHEN ''gift''::text THEN ''🎁 Has recibido un regalo''::text' in view_sql)=0
   or position('WHEN n.kind = ''gift''::text THEN ''#/regalos''::text' in view_sql)=0
 then raise exception 'El formato del historial ha cambiado: no se actualiza'; end if;
 view_sql:=replace(view_sql,
  'WHEN n.kind = ''gift''::text THEN ''shop''::text',
  'WHEN n.kind = ''exclusive_tag_unlock''::text THEN ''achievements''::text
            WHEN n.kind = ''gift''::text THEN ''shop''::text');
 view_sql:=replace(view_sql,
  'WHEN ''gift''::text THEN ''🎁 Has recibido un regalo''::text',
  'WHEN ''exclusive_tag_unlock''::text THEN ''🏅 Nueva etiqueta exclusiva desbloqueada''::text
            WHEN ''gift''::text THEN ''🎁 Has recibido un regalo''::text');
 view_sql:=replace(view_sql,
  'WHEN n.kind = ''gift''::text THEN ''#/regalos''::text',
  'WHEN n.kind = ''exclusive_tag_unlock''::text THEN ''#/cuenta''::text
            WHEN n.kind = ''gift''::text THEN ''#/regalos''::text');
 execute 'create or replace view public.member_notification_history_core as '||view_sql;
end $do$;