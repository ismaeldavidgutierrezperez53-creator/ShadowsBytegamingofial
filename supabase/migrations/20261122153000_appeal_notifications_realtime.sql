do $$
begin
 if not exists (
  select 1 from pg_publication_tables
  where pubname='supabase_realtime'
    and schemaname='public' and tablename='member_appeal_notifications'
 ) then
  alter publication supabase_realtime add table public.member_appeal_notifications;
 end if;
end $$;