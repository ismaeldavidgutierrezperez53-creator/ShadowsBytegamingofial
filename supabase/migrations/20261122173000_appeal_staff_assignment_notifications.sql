-- Notification on each real appeal assignment or reassignment.
-- Keep existing one-per-case notices deduplicated while allowing multiple
-- 'assigned' notices when the same appeal is legitimately reassigned later.
ALTER TABLE public.member_appeal_notifications
 DROP CONSTRAINT IF EXISTS sb_appeal_notice_kind_chk;
ALTER TABLE public.member_appeal_notifications
 ADD CONSTRAINT sb_appeal_notice_kind_chk
 CHECK (kind IN ('submitted','accepted','rejected','overdue',
  'message_to_staff','message_to_member','assigned'));
DROP INDEX IF EXISTS public.sb_appeal_notices_once_per_case;
CREATE UNIQUE INDEX sb_appeal_notices_once_per_case
 ON public.member_appeal_notifications(recipient_id,appeal_id,kind)
 WHERE message_id IS NULL AND kind <> 'assigned';

-- The assignment audit and the recipient notification are created in
-- the same transaction. No notification for clearing an assignment or
-- for resaving the same assignee.
CREATE OR REPLACE FUNCTION sb_appeal_private.audit_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
BEGIN
 IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
  INSERT INTO public.member_appeal_assignment_history(
   appeal_id,changed_by,previous_assignee,new_assignee
  ) VALUES (NEW.id,NEW.assigned_by,OLD.assigned_to,NEW.assigned_to);
  IF NEW.assigned_to IS NOT NULL THEN
   INSERT INTO public.member_appeal_notifications(
    recipient_id,appeal_id,kind
   ) VALUES (NEW.assigned_to,NEW.id,'assigned');
  END IF;
 END IF;
 RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION sb_appeal_private.audit_assignment()
 FROM PUBLIC,anon,authenticated;