-- Incorporar notificaciones de Mi Info al historial existente sin alterar la estructura de columnas.
do $m$
declare d text;
begin
 d:=pg_get_viewdef('public.member_notification_history_core'::regclass,true);
 if position('info_reaction' in d)>0 then return; end if;
 if position('WHEN n.kind = ''follow''::text THEN ''followers''::text' in d)=0
 or position('WHEN ''follow''::text THEN ''👥 Nuevo seguidor''::text' in d)=0
 or position('WHEN n.kind = ''follow''::text THEN ''#/perfil?id=''::text || n.actor_id::text' in d)=0
 then raise exception 'Unexpected notification history view format'; end if;
 d:=replace(d,
 'WHEN n.kind = ''follow''::text THEN ''followers''::text',
 'WHEN n.kind = ''info_reaction''::text THEN ''community''::text
            WHEN n.kind = ''follow''::text THEN ''followers''::text');
 d:=replace(d,
 'WHEN ''follow''::text THEN ''👥 Nuevo seguidor''::text',
 'WHEN ''info_reaction''::text THEN ''💜 Han reaccionado a tu Info''::text
            WHEN ''follow''::text THEN ''👥 Nuevo seguidor''::text');
 d:=replace(d,
 'WHEN n.kind = ''follow''::text THEN ''#/perfil?id=''::text || n.actor_id::text',
 'WHEN n.kind = ''info_reaction''::text THEN ''#/perfil?id=''::text || n.recipient_id::text
            WHEN n.kind = ''follow''::text THEN ''#/perfil?id=''::text || n.actor_id::text');
 execute 'create or replace view public.member_notification_history_core as ' || d;
end $m$;
