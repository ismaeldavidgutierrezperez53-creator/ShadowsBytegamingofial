-- Conversaciones privadas, historial auditable y recordatorios automáticos.
CREATE TABLE IF NOT EXISTS public.member_appeal_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 appeal_id uuid NOT NULL REFERENCES public.member_sanction_appeals(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 sender_role text NOT NULL CHECK (sender_role IN ('member','staff')),
 body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 2 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_appeal_messages_case_created
 ON public.member_appeal_messages(appeal_id,created_at,id);
ALTER TABLE public.member_appeal_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_appeal_messages FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.member_appeal_messages TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.member_appeal_messages TO service_role;
DROP POLICY IF EXISTS sb_appeal_chat_read ON public.member_appeal_messages;
CREATE POLICY sb_appeal_chat_read ON public.member_appeal_messages
 FOR SELECT TO authenticated USING (
  EXISTS (
   SELECT 1 FROM public.member_sanction_appeals a
   WHERE a.id=appeal_id AND (
     a.member_id=(SELECT auth.uid()) OR
     EXISTS(SELECT 1 FROM public.site_staff_roles sr
       WHERE sr.user_id=(SELECT auth.uid()) AND sr.role IN ('owner','admin','moderator'))
   )
  )
 );

-- Temporarily verified sessions for members whose accounts cannot log in.
-- Tokens are one-way hashed and never queryable by browsers.
CREATE TABLE IF NOT EXISTS public.member_appeal_access_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 appeal_id uuid NOT NULL REFERENCES public.member_sanction_appeals(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE CHECK (length(token_hash)=64),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_appeal_access_tokens_expiry
 ON public.member_appeal_access_tokens(expires_at);
ALTER TABLE public.member_appeal_access_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_appeal_access_tokens FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.member_appeal_access_tokens TO service_role;

-- Multiple messages in one appeal must each produce an independent notification.
ALTER TABLE public.member_appeal_notifications
 DROP CONSTRAINT IF EXISTS member_appeal_notifications_kind_check;
ALTER TABLE public.member_appeal_notifications
 DROP CONSTRAINT IF EXISTS member_appeal_notifications_recipient_id_appeal_id_kind_key;
ALTER TABLE public.member_appeal_notifications
 ADD COLUMN IF NOT EXISTS message_id uuid REFERENCES public.member_appeal_messages(id) ON DELETE CASCADE;
ALTER TABLE public.member_appeal_notifications
 ADD CONSTRAINT sb_appeal_notice_kind_chk
 CHECK (kind IN ('submitted','accepted','rejected','overdue','message_to_staff','message_to_member'));
ALTER TABLE public.member_appeal_notifications
 ADD CONSTRAINT sb_appeal_notice_message_chk
 CHECK ((kind IN ('message_to_staff','message_to_member')) = (message_id IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS sb_appeal_notices_once_per_case
 ON public.member_appeal_notifications(recipient_id,appeal_id,kind)
 WHERE message_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sb_appeal_notices_once_per_message
 ON public.member_appeal_notifications(recipient_id,message_id)
 WHERE message_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sb_appeal_private.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $func$
BEGIN
 IF new.sender_role='member' THEN
  INSERT INTO public.member_appeal_notifications(recipient_id,appeal_id,kind,message_id)
   SELECT sr.user_id,new.appeal_id,'message_to_staff',new.id
   FROM public.site_staff_roles sr
   WHERE sr.role IN ('owner','admin','moderator') AND sr.user_id<>new.sender_id
   ON CONFLICT DO NOTHING;
 ELSE
  INSERT INTO public.member_appeal_notifications(recipient_id,appeal_id,kind,message_id)
   SELECT a.member_id,new.appeal_id,'message_to_member',new.id
   FROM public.member_sanction_appeals a
   WHERE a.id=new.appeal_id AND a.member_id<>new.sender_id
   ON CONFLICT DO NOTHING;
 END IF;
 RETURN new;
END
$func$;
REVOKE ALL ON FUNCTION sb_appeal_private.notify_new_message() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sb_appeal_message_notifications ON public.member_appeal_messages;
CREATE TRIGGER sb_appeal_message_notifications
 AFTER INSERT ON public.member_appeal_messages
 FOR EACH ROW EXECUTE FUNCTION sb_appeal_private.notify_new_message();

CREATE OR REPLACE FUNCTION sb_appeal_private.enqueue_overdue_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $func$
BEGIN
 INSERT INTO public.member_appeal_notifications(recipient_id,appeal_id,kind)
 SELECT sr.user_id,a.id,'overdue'
 FROM public.member_sanction_appeals a
 CROSS JOIN public.site_staff_roles sr
 WHERE a.status='pending'
   AND a.created_at < now() - interval '24 hours'
   AND sr.role IN ('owner','admin','moderator')
   AND sr.user_id<>a.member_id
 ON CONFLICT DO NOTHING;
END
$func$;
REVOKE ALL ON FUNCTION sb_appeal_private.enqueue_overdue_reminders() FROM PUBLIC,anon,authenticated;

-- pg_cron is already installed on this project. Run at the top of every hour (UTC).
SELECT cron.schedule(
 'sb-appeal-overdue-reminders-hourly',
 '0 * * * *',
 'select sb_appeal_private.enqueue_overdue_reminders();'
);