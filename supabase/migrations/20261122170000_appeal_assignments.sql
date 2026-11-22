-- Reviewer assignment for moderation appeals. All mutations go through the
-- authenticated Edge Function; no browser may assign roles or rewrite the audit.
ALTER TABLE public.member_sanction_appeals
 ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
CREATE INDEX IF NOT EXISTS sb_member_appeals_assignee_pending_idx
 ON public.member_sanction_appeals(assigned_to,created_at DESC)
 WHERE status='pending';

CREATE TABLE IF NOT EXISTS public.member_appeal_assignment_history(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 appeal_id uuid NOT NULL REFERENCES public.member_sanction_appeals(id) ON DELETE CASCADE,
 changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 previous_assignee uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 new_assignee uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sb_appeal_assignment_history_case_idx
 ON public.member_appeal_assignment_history(appeal_id,created_at,id);
ALTER TABLE public.member_appeal_assignment_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_appeal_assignment_history FROM public, anon, authenticated;
GRANT SELECT ON public.member_appeal_assignment_history TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.member_appeal_assignment_history TO service_role;
DROP POLICY IF EXISTS sb_appeal_assignment_history_staff_read
 ON public.member_appeal_assignment_history;
CREATE POLICY sb_appeal_assignment_history_staff_read
 ON public.member_appeal_assignment_history FOR SELECT TO authenticated
 USING (EXISTS(
   SELECT 1 FROM public.site_staff_roles sr
   WHERE sr.user_id=(SELECT auth.uid()) AND sr.role IN ('owner','admin','moderator')
 ));

CREATE OR REPLACE FUNCTION sb_appeal_private.audit_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
BEGIN
 IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
  INSERT INTO public.member_appeal_assignment_history(
   appeal_id,changed_by,previous_assignee,new_assignee
  ) VALUES (NEW.id,NEW.assigned_by,OLD.assigned_to,NEW.assigned_to);
 END IF;
 RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION sb_appeal_private.audit_assignment()
 FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sb_appeal_assignment_changed
 ON public.member_sanction_appeals;
CREATE TRIGGER sb_appeal_assignment_changed
 AFTER UPDATE OF assigned_to ON public.member_sanction_appeals
 FOR EACH ROW EXECUTE FUNCTION sb_appeal_private.audit_assignment();