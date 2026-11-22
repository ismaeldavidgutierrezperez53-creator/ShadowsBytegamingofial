-- Avisos oficiales de competiciones, medallas y misiones. No alteran XP ni saldos.
-- La notificación web push de community_competition_awards ya existe:
-- aquí solo se crea el registro interno y se evita enviar el push dos veces.

alter table public.member_notifications
  add column if not exists competition_id uuid references public.community_competitions(id) on delete cascade,
  add column if not exists competition_reminder_week date,
  add column if not exists competition_medal_place smallint;

alter table public.member_notifications
  drop constraint member_notifications_kind_check;
alter table public.member_notifications
  add constraint member_notifications_kind_check
  check (kind = any(array[
   'follow','like','comment','gift','game_like','game_comment','game_reply',
   'profile_view','poll','poll_reminder','poll_season_prize','poll_trophy_like',
   'poll_museum_prize','news_reply','tournament_full','tournament_match',
   'tournament_finished','mention','moderation_warning','moderation_suspend',
   'moderation_ban','moderation_lift',
   'competition_published','competition_start','competition_mission_reminder','competition_medal'
  ]::text[]));

alter table public.member_notifications
  drop constraint member_notifications_check;
alter table public.member_notifications
  add constraint member_notifications_check check (
    recipient_id <> actor_id
    or (kind in ('poll','poll_reminder') and poll_id is not null)
    or (kind='poll_season_prize' and season_month is not null)
    or (kind='poll_museum_prize' and museum_month is not null)
    or (kind in ('tournament_full','tournament_match','tournament_finished') and tournament_id is not null)
    or kind in ('competition_published','competition_start','competition_mission_reminder','competition_medal')
  );

alter table public.member_notifications
  add constraint competition_notification_reference_check check (
    (kind not in ('competition_published','competition_start','competition_medal')
     or (competition_id is not null and competition_reminder_week is null))
    and (kind <> 'competition_mission_reminder'
     or (competition_reminder_week is not null and competition_id is null))
    and (kind <> 'competition_medal'
     or competition_medal_place in (1,2,3))
    and (kind = 'competition_medal' or competition_medal_place is null)
  );

create unique index if not exists competition_notification_event_once
  on public.member_notifications(recipient_id,kind,competition_id)
  where kind in ('competition_published','competition_start','competition_medal');
create unique index if not exists competition_notification_mission_week_once
  on public.member_notifications(recipient_id,kind,competition_reminder_week)
  where kind='competition_mission_reminder';

create or replace function private.sb_notify_competition_published()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.status<>'published' or new.ends_at<=now() then return new; end if;
 if tg_op='UPDATE' and old.status='published' then return new; end if;
 insert into public.member_notifications(recipient_id,actor_id,kind,competition_id)
 select u.id,new.created_by,'competition_published',new.id
 from auth.users u
 where u.email_confirmed_at is not null
   and u.deleted_at is null
   and u.is_anonymous is distinct from true
 on conflict do nothing;
 return new;
end $$;

create or replace function private.sb_notify_competition_medal()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.place not in (1,2,3) then return new; end if;
 insert into public.member_notifications
  (recipient_id,actor_id,kind,competition_id,competition_medal_place)
 values (new.user_id,new.user_id,'competition_medal',new.competition_id,new.place)
 on conflict do nothing;
 return new;
end $$;

drop trigger if exists sb_competition_publication_notice on public.community_competitions;
create trigger sb_competition_publication_notice
after insert or update of status on public.community_competitions
for each row execute function private.sb_notify_competition_published();

drop trigger if exists sb_competition_medal_notice on public.community_competition_awards;
create trigger sb_competition_medal_notice
after insert on public.community_competition_awards
for each row execute function private.sb_notify_competition_medal();

-- Existing web-push trigger handles general member_notifications, but award
-- inserts already send a dedicated push from community_competition_awards.
create or replace function sb_push_private.enqueue_web_push()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
 secret text;
 interested boolean:=false;
begin
 if tg_table_name='member_notifications' then
   if new.kind='competition_medal' then return new; end if;
   select exists(select 1 from public.member_web_push_subscriptions
                 where user_id=new.recipient_id) into interested;
 elsif tg_table_name='member_direct_messages' then
   select exists(select 1 from public.member_web_push_subscriptions
                 where user_id=new.recipient_id and user_id<>new.sender_id) into interested;
 elsif tg_table_name='member_chat_group_messages' then
   select exists(
    select 1 from public.member_chat_group_members gm
    join public.member_web_push_subscriptions ps on ps.user_id=gm.user_id
    where gm.group_id=new.group_id and gm.user_id<>new.sender_id
   ) into interested;
 end if;
 if not interested then return new; end if;
 select decrypted_secret into secret
 from vault.decrypted_secrets where name='sb_webpush_dispatch_secret' limit 1;
 if secret is null then return new; end if;
 perform net.http_post(
  url:='https://nutoxlbdotcllwlshhhr.supabase.co/functions/v1/dispatch-web-push',
  headers:=pg_catalog.jsonb_build_object(
   'Content-Type','application/json','X-SB-Push-Secret',secret),
  body:=pg_catalog.jsonb_build_object('type',tg_table_name,'id',new.id),
  timeout_milliseconds:=8000
 );
 return new;
end $$;

create or replace function private.sb_queue_competition_reminders()
returns integer language plpgsql security definer set search_path=''
as $$
declare
 sent integer:=0;
 batch_count integer:=0;
 localtime timestamp without time zone;
begin
 -- Reminder approximately 24h before a published challenge begins, only once.
 with added as (
  insert into public.member_notifications(recipient_id,actor_id,kind,competition_id)
  select e.user_id,e.user_id,'competition_start',c.id
  from public.community_competition_entries e
  join public.community_competitions c on c.id=e.competition_id
  join auth.users u on u.id=e.user_id
  where c.status='published'
    and c.starts_at>now() and c.starts_at<=now()+interval '24 hours'
    and c.ends_at>now()
    and u.email_confirmed_at is not null and u.deleted_at is null
    and u.is_anonymous is distinct from true
  on conflict do nothing returning 1
 )
 select count(*) into batch_count from added;
 sent:=sent+batch_count;

 -- Monday 17:00 Europe/Madrid: one reminder per member with an
 -- unfinished enrolled activity; per-week index prevents repeat notices.
 localtime:=now() at time zone 'Europe/Madrid';
 if extract(isodow from localtime)=1 and extract(hour from localtime)=17 then
  with added as (
   insert into public.member_notifications
    (recipient_id,actor_id,kind,competition_reminder_week)
   select distinct e.user_id,e.user_id,'competition_mission_reminder',
          date_trunc('week',localtime)::date
   from public.community_competition_entries e
   join public.community_competitions c on c.id=e.competition_id
   join auth.users u on u.id=e.user_id
   where c.status='published' and c.starts_at<=now() and c.ends_at>now()
     and e.completed=false and e.score=0
     and u.email_confirmed_at is not null and u.deleted_at is null
     and u.is_anonymous is distinct from true
   on conflict do nothing returning 1
  )
  select count(*) into batch_count from added;
  sent:=sent+batch_count;
 end if;
 return sent;
end $$;

revoke all on function private.sb_notify_competition_published() from public,anon,authenticated;
revoke all on function private.sb_notify_competition_medal() from public,anon,authenticated;
revoke all on function private.sb_queue_competition_reminders() from public,anon,authenticated;

select cron.schedule(
 'sb-competition-reminders-hourly',
 '12 * * * *',
 'select private.sb_queue_competition_reminders();'
);
