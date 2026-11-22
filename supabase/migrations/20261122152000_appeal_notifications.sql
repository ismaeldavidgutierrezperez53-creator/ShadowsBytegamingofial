-- Notificaciones privadas de apelaciones.
-- Se generan con un registro único por destinatario, apelación y evento.
create table if not exists public.member_appeal_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 appeal_id uuid not null references public.member_sanction_appeals(id) on delete cascade,
 kind text not null check (kind in ('submitted','accepted','rejected')),
 is_read boolean not null default false,
 dismissed_at timestamptz,
 created_at timestamptz not null default now(),
 unique(recipient_id,appeal_id,kind)
);
create index if not exists member_appeal_notifications_recipient
 on public.member_appeal_notifications(recipient_id,created_at desc);

alter table public.member_appeal_notifications enable row level security;
revoke all on public.member_appeal_notifications from public,anon,authenticated;
grant select on public.member_appeal_notifications to authenticated;
grant update(is_read,dismissed_at) on public.member_appeal_notifications to authenticated;
grant select,insert,update,delete on public.member_appeal_notifications to service_role;
drop policy if exists sb_appeal_notice_read_self on public.member_appeal_notifications;
create policy sb_appeal_notice_read_self on public.member_appeal_notifications
 for select to authenticated
 using (recipient_id=(select auth.uid()));
drop policy if exists sb_appeal_notice_mark_self on public.member_appeal_notifications;
create policy sb_appeal_notice_mark_self on public.member_appeal_notifications
 for update to authenticated
 using (recipient_id=(select auth.uid()))
 with check (recipient_id=(select auth.uid()));

-- La notificación al equipo se genera aunque la apelación entre por código de correo.
create schema if not exists sb_appeal_private;
revoke all on schema sb_appeal_private from public,anon,authenticated;
create or replace function sb_appeal_private.notify_staff_new_appeal()
returns trigger language plpgsql security definer set search_path=''
as $function$
begin
 insert into public.member_appeal_notifications(recipient_id,appeal_id,kind)
 select sr.user_id,new.id,'submitted'
 from public.site_staff_roles sr
 where sr.role in ('owner','admin','moderator') and sr.user_id <> new.member_id
 on conflict(recipient_id,appeal_id,kind) do nothing;
 return new;
end
$function$;
revoke all on function sb_appeal_private.notify_staff_new_appeal() from public,anon,authenticated;
drop trigger if exists sb_appeal_new_staff_notice on public.member_sanction_appeals;
create trigger sb_appeal_new_staff_notice after insert on public.member_sanction_appeals
 for each row execute function sb_appeal_private.notify_staff_new_appeal();

-- Encadenar el evento con el despachador Web Push ya existente. El secreto nunca se expone.
create or replace function sb_push_private.enqueue_appeal_web_push()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare push_secret text;
begin
 if not exists(select 1 from public.member_web_push_subscriptions
   where user_id=new.recipient_id) then return new; end if;
 select decrypted_secret into push_secret
   from vault.decrypted_secrets
   where name='sb_webpush_dispatch_secret' limit 1;
 if push_secret is null then return new; end if;
 perform net.http_post(
   url:='https://nutoxlbdotcllwlshhhr.supabase.co/functions/v1/dispatch-web-push',
   headers:=pg_catalog.jsonb_build_object(
     'Content-Type','application/json','X-SB-Push-Secret',push_secret
   ),
   body:=pg_catalog.jsonb_build_object(
     'type','member_appeal_notifications','id',new.id
   ),
   timeout_milliseconds:=8000
 );
 return new;
end
$function$;
revoke all on function sb_push_private.enqueue_appeal_web_push() from public,anon,authenticated;
drop trigger if exists sb_web_push_appeal_notifications on public.member_appeal_notifications;
create trigger sb_web_push_appeal_notifications after insert on public.member_appeal_notifications
 for each row execute function sb_push_private.enqueue_appeal_web_push();