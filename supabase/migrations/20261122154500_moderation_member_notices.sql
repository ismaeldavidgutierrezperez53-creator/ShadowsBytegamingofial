-- Shadows Byte V2: avisos privados de decisiones de moderación.
-- Compatible con el centro de notificaciones y el disparador de Web Push ya existente.
alter table public.member_notifications
 add column if not exists sanction_event_id bigint references public.member_moderation_events(id) on delete cascade;

create unique index if not exists member_notifications_sanction_event_unique
 on public.member_notifications(recipient_id,sanction_event_id)
 where sanction_event_id is not null;

alter table public.member_notifications drop constraint if exists member_notifications_kind_check;
alter table public.member_notifications add constraint member_notifications_kind_check
check (kind in (
 'follow','like','comment','gift','game_like','game_comment','game_reply',
 'profile_view','poll','poll_reminder','poll_season_prize','poll_trophy_like',
 'poll_museum_prize','news_reply','tournament_full','tournament_match',
 'tournament_finished','mention',
 'moderation_warning','moderation_suspend','moderation_ban','moderation_lift'
));

create schema if not exists sb_moderation_private;
revoke all on schema sb_moderation_private from public,anon,authenticated;

create or replace function sb_moderation_private.notify_sanction_event()
returns trigger language plpgsql security definer set search_path=''
as $function$
begin
 if new.actor_id is not null and new.actor_id <> new.target_id then
  begin
   insert into public.member_notifications(recipient_id,actor_id,kind,sanction_event_id)
   values(new.target_id,new.actor_id,'moderation_'||new.action,new.id)
   on conflict do nothing;
  exception when others then
   raise warning 'No se pudo generar aviso de moderación para evento %: %',
     new.id,sqlerrm;
  end;
 end if;
 return new;
end
$function$;
revoke all on function sb_moderation_private.notify_sanction_event() from public,anon,authenticated;
drop trigger if exists sb_moderation_event_notification on public.member_moderation_events;
create trigger sb_moderation_event_notification
 after insert on public.member_moderation_events
 for each row execute function sb_moderation_private.notify_sanction_event();
