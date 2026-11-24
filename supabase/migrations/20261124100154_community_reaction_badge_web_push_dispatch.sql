-- Nuevos desbloqueos generan web push desde el mismo canal seguro que otros logros.
CREATE OR REPLACE FUNCTION sb_push_private.enqueue_web_push_extra()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  event_row jsonb;
  target uuid;
  dispatch_secret text;
  metadata jsonb;
begin
  event_row := pg_catalog.to_jsonb(new);
  if TG_TABLE_NAME = 'member_report_notifications' then
    target := (event_row->>'recipient_id')::uuid;
  elsif TG_TABLE_NAME = 'member_private_calls' or TG_TABLE_NAME = 'member_group_calls' then
    if event_row->>'status' <> 'ringing' then return new; end if;
    target := (event_row->>'callee_id')::uuid;
  elsif TG_TABLE_NAME = 'member_group_video_invites' then
    if event_row->>'response' <> 'pending' then return new; end if;
    target := (event_row->>'invitee_id')::uuid;
  elsif TG_TABLE_NAME = any(array[
    'member_community_reaction_badge_notifications','member_gamer_badge_notifications','member_point_goal_notifications',
    'member_milestone_awards','member_poll_milestone_awards',
    'community_competition_awards','mystery_box_monthly_awards',
    'shop_season_podium_awards'
  ]) then
    target := (event_row->>'user_id')::uuid;
  else
    return new;
  end if;
  if target is null or not exists(
    select 1 from public.member_web_push_subscriptions where user_id=target
  ) then
    return new;
  end if;
  select decrypted_secret into dispatch_secret
    from vault.decrypted_secrets
    where name='sb_webpush_dispatch_secret' limit 1;
  if dispatch_secret is null then return new; end if;
  metadata := pg_catalog.jsonb_build_object(
    'badge_key',event_row->>'badge_key',
    'goal_id',event_row->>'goal_id',
    'milestone',event_row->>'milestone',
    'level',event_row->>'level',
    'competition_id',event_row->>'competition_id',
    'month_start',event_row->>'month_start',
    'event_id',event_row->>'event_id',
    'place',event_row->>'place'
  );
  perform net.http_post(
    url:='https://nutoxlbdotcllwlshhhr.supabase.co/functions/v1/dispatch-web-push',
    headers:=pg_catalog.jsonb_build_object('Content-Type','application/json','X-SB-Push-Secret',dispatch_secret),
    body:=pg_catalog.jsonb_build_object(
      'type',TG_TABLE_NAME,
      'id',coalesce(event_row->>'id',event_row->>'user_id'),
      'meta',metadata
    ),
    timeout_milliseconds:=8000
  );
  return new;
end;
$function$
;
create trigger sb_web_push_extra_member_community_reaction_badge_notifications
after insert on public.member_community_reaction_badge_notifications
for each row execute function sb_push_private.enqueue_web_push_extra();
