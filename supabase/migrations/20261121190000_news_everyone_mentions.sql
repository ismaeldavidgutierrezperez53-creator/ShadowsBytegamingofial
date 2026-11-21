-- Menciones globales @everyone en noticias; sólo publicaciones realizadas por admins autenticados.
create or replace function private.sb_notify_news_article_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target record;
  actor uuid;
  full_text text;
begin
  if new.status <> 'published' or new.published_at is null or new.published_at > pg_catalog.now() then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'published'
     and new.title is not distinct from old.title
     and new.excerpt is not distinct from old.excerpt
     and new.content is not distinct from old.content then
    return new;
  end if;

  actor := (select auth.uid());
  if actor is null or (select auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    return new;
  end if;
  full_text := pg_catalog.concat_ws(' ', new.title, new.excerpt, new.content);

  -- Un único aviso por miembro y artículo (el índice existente evita duplicados).
  -- La mención global comprende también los perfiles que no son públicos.
  if full_text ~* '(^|[^[:alnum:]_])@everyone([^[:alnum:]_]|$)' then
    insert into public.member_notifications (recipient_id, actor_id, kind, news_id)
    select p.id, actor, 'mention', new.id
    from public.profiles as p
    where p.id <> actor
    on conflict do nothing;
    return new;
  end if;

  -- Las menciones individuales mantienen su límite actual.
  for target in
    select distinct p.id
    from (
      select (pg_catalog.regexp_matches(full_text, '(^|[^[:alnum:]_])@([A-Za-z0-9_]{2,32})', 'g'))[2] as uname
    ) as mention
    join public.profiles as p on pg_catalog.lower(p.username) = pg_catalog.lower(mention.uname)
    where p.is_public is true and p.id <> actor
    limit 5
  loop
    insert into public.member_notifications (recipient_id, actor_id, kind, news_id)
    values (target.id, actor, 'mention', new.id)
    on conflict do nothing;
  end loop;
  return new;
end;
$function$;

-- Las notificaciones por miembro ya generan push individual.
-- Evita enviar además el push global de noticias cuando el artículo contiene @everyone.
create or replace function sb_push_private.enqueue_news_web_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  dispatch_secret text;
begin
  if new.status is distinct from 'published' or new.published_at is null or new.published_at > pg_catalog.now() then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' and old.published_at is not null and old.published_at <= pg_catalog.now() then
    return new;
  end if;
  if (select auth.uid()) is not null
     and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
     and pg_catalog.concat_ws(' ',new.title,new.excerpt,new.content)
       ~* '(^|[^[:alnum:]_])@everyone([^[:alnum:]_]|$)' then
    return new;
  end if;
  if not exists(select 1 from public.member_web_push_subscriptions) then
    return new;
  end if;
  select decrypted_secret into dispatch_secret
    from vault.decrypted_secrets where name = 'sb_webpush_dispatch_secret' limit 1;
  if dispatch_secret is null then return new; end if;
  perform net.http_post(
    url := 'https://nutoxlbdotcllwlshhhr.supabase.co/functions/v1/dispatch-web-push',
    headers := pg_catalog.jsonb_build_object('Content-Type','application/json','X-SB-Push-Secret',dispatch_secret),
    body := pg_catalog.jsonb_build_object('type','news','id',new.id),
    timeout_milliseconds := 8000
  );
  return new;
end;
$function$;
