-- Compatibility fix: appeal notices now use a conditional unique index,
-- so an explicit conflict target no longer matches any full unique constraint.
CREATE OR REPLACE FUNCTION sb_appeal_private.notify_staff_new_appeal()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
BEGIN
 INSERT INTO public.member_appeal_notifications(recipient_id,appeal_id,kind)
 SELECT sr.user_id,new.id,'submitted'
 FROM public.site_staff_roles sr
 WHERE sr.role IN ('owner','admin','moderator') AND sr.user_id <> new.member_id
 ON CONFLICT DO NOTHING;
 RETURN new;
END
$function$;
REVOKE ALL ON FUNCTION sb_appeal_private.notify_staff_new_appeal() FROM PUBLIC,anon,authenticated;