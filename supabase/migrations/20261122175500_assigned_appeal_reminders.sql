-- One private reminder per assignment cycle after 24 hours without resolution.
-- Existing unassigned-appeal reminders stay independent.
ALTER TABLE public.member_appeal_assignment_history
 ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

ALTER TABLE public.member_appeal_notifications
 DROP CONSTRAINT IF EXISTS sb_appeal_notice_kind_chk;
ALTER TABLE public.member_appeal_notifications
 ADD CONSTRAINT sb_appeal_notice_kind_chk
 CHECK (kind IN ('submitted','accepted','rejected','overdue',
   'message_to_staff','message_to_member','assigned','assigned_reminder'));

DROP INDEX IF EXISTS public.sb_appeal_notices_once_per_case;
CREATE UNIQUE INDEX sb_appeal_notices_once_per_case
 ON public.member_appeal_notifications(recipient_id,appeal_id,kind)
 WHERE message_id IS NULL
   AND kind NOT IN ('assigned','assigned_reminder');

CREATE INDEX IF NOT EXISTS sb_appeal_assignment_reminders_due_idx
 ON public.member_appeal_assignment_history(created_at,id)
 WHERE new_assignee IS NOT NULL AND reminded_at IS NULL;

CREATE OR REPLACE FUNCTION sb_appeal_private.enqueue_assigned_reminders()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE delivered integer := 0;
BEGIN
 WITH due AS (
   SELECT h.id,h.appeal_id,h.new_assignee
   FROM public.member_appeal_assignment_history h
   JOIN public.member_sanction_appeals a ON a.id=h.appeal_id
   WHERE a.status='pending'
     AND a.assigned_to=h.new_assignee
     AND h.new_assignee IS NOT NULL
     AND h.reminded_at IS NULL
     AND h.created_at <= now()-interval '24 hours'
     AND h.id=(SELECT max(latest.id)
               FROM public.member_appeal_assignment_history latest
               WHERE latest.appeal_id=h.appeal_id)
     AND EXISTS(
       SELECT 1 FROM public.site_staff_roles sr
       WHERE sr.user_id=h.new_assignee
         AND sr.role IN ('owner','admin','moderator')
     )
   FOR UPDATE OF h SKIP LOCKED
 ), marked AS (
   UPDATE public.member_appeal_assignment_history h
      SET reminded_at=now()
     FROM due d
    WHERE h.id=d.id
   RETURNING h.appeal_id,h.new_assignee
 ), sent AS (
   INSERT INTO public.member_appeal_notifications(
     recipient_id,appeal_id,kind
   )
   SELECT new_assignee,appeal_id,'assigned_reminder'
   FROM marked
   RETURNING id
 )
 SELECT count(*)::integer INTO delivered FROM sent;
 RETURN delivered;
END
$function$;

REVOKE ALL ON FUNCTION sb_appeal_private.enqueue_assigned_reminders()
 FROM PUBLIC,anon,authenticated;
-- A dedicated job runs once per hour at minute 15; each assignment is
-- reminded at most once. Reassignment creates a new audit row and clock.
DO $job$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM cron.job
                WHERE jobname='sb-appeal-assigned-reminders-hourly') THEN
  PERFORM cron.schedule(
   'sb-appeal-assigned-reminders-hourly',
   '15 * * * *',
   'SELECT sb_appeal_private.enqueue_assigned_reminders();'
  );
 END IF;
END
$job$;