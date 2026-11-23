-- Notificación automática al recibir una reacción a Mi Info.
-- La notificación no se envía al reaccionar a la propia Info y se limita el spam por cambios de emoji.
alter table public.member_notifications add column if not exists info_reaction text;
alter table public.member_notifications drop constraint if exists member_notifications_kind_check;
alter table public.member_notifications add constraint member_notifications_kind_check check(kind in ('follow','like','comment','gift','game_like','game_comment','game_reply','profile_view','poll','poll_reminder','poll_season_prize','poll_trophy_like','poll_museum_prize','news_reply','tournament_full','tournament_match','tournament_finished','mention','moderation_warning','moderation_suspend','moderation_ban','moderation_lift','competition_published','competition_start','competition_mission_reminder','competition_medal','exclusive_tag_unlock','info_reaction'));
alter table public.member_notifications add constraint member_notifications_info_reaction_valid
 check ((kind='info_reaction')=(info_reaction is not null)
 and (info_reaction is null or info_reaction in ('heart','laugh','fire','like')));
create index if not exists member_notifications_info_reaction_recent
 on public.member_notifications(recipient_id,actor_id,created_at desc) where kind='info_reaction';
create or replace function private.notify_info_reaction()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if new.info_user_id=new.reactor_id then return new; end if;
 if tg_op='UPDATE' and old.reaction is not distinct from new.reaction then return new; end if;
 if not exists (
  select 1 from public.member_profile_info i
  join public.profiles p on p.id=i.user_id
  where i.user_id=new.info_user_id and i.is_public and p.is_public
  and length(btrim(i.about_text))>0
 ) then return new; end if;
 if exists (
  select 1 from public.member_notifications n
  where n.recipient_id=new.info_user_id and n.actor_id=new.reactor_id
  and n.kind='info_reaction' and n.created_at>now()-interval '5 minutes'
 ) then return new; end if;
 insert into public.member_notifications(recipient_id,actor_id,kind,info_reaction)
 values(new.info_user_id,new.reactor_id,'info_reaction',new.reaction);
 return new;
end;
$fn$;
revoke all on function private.notify_info_reaction() from public,anon,authenticated;
drop trigger if exists member_info_reaction_notification on public.member_profile_info_reactions;
create trigger member_info_reaction_notification
 after insert or update of reaction on public.member_profile_info_reactions
 for each row execute function private.notify_info_reaction();
