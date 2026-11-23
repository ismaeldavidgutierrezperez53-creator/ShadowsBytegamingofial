-- Evitar reacciones heredadas de una frase que ya no existe.
create schema if not exists private;
create or replace function private.clear_member_info_reactions_when_text_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.member_profile_info_reactions where info_user_id = new.user_id;
  return new;
end;
$$;
revoke all on function private.clear_member_info_reactions_when_text_changes() from public, anon, authenticated;
drop trigger if exists clear_member_info_reactions_on_change on public.member_profile_info;
create trigger clear_member_info_reactions_on_change
 after update of about_text on public.member_profile_info
 for each row when (old.about_text is distinct from new.about_text)
 execute function private.clear_member_info_reactions_when_text_changes();
