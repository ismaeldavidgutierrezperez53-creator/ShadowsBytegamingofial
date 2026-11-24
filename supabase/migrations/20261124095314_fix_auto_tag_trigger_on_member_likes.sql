
-- Corregir accesos a campos ausentes en trigger genérico de etiquetas automáticas.
-- IF separa las ramas de SQL para evitar evaluar NEW.author_id en member_likes.
create or replace function private.sb_auto_tag_event()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare target_user uuid;
begin
  if tg_table_name='member_posts' or tg_table_name='member_comments' then
    target_user:=new.author_id;
  else
    target_user:=new.user_id;
  end if;
  if target_user is not null then
    perform private.sb_sync_verified_auto_tags(target_user);
  end if;
  return new;
end;
$fn$;
revoke all on function private.sb_auto_tag_event() from public,anon,authenticated;
