-- Sistema de apelaciones de Shadows Byte Gaming Official V2
-- Cada sanción admite una apelación; las resoluciones quedan auditadas.
create table if not exists public.member_sanction_appeals (
  id uuid primary key default gen_random_uuid(),
  sanction_event_id bigint not null unique references public.member_moderation_events(id) on delete restrict,
  member_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (length(trim(reason)) between 15 and 1500),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  reviewer_id uuid references auth.users(id) on delete set null,
  review_note text check (review_note is null or length(trim(review_note)) between 10 and 1000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint review_complete check (
    (status = 'pending' and reviewer_id is null and review_note is null and reviewed_at is null)
    or (status in ('accepted','rejected') and reviewer_id is not null and review_note is not null and reviewed_at is not null)
  )
);
create index if not exists member_sanction_appeals_review_queue
  on public.member_sanction_appeals(status,created_at desc);
create index if not exists member_sanction_appeals_by_member
  on public.member_sanction_appeals(member_id,created_at desc);
alter table public.member_sanction_appeals enable row level security;
revoke all on public.member_sanction_appeals from public,anon,authenticated;
grant select on public.member_sanction_appeals to authenticated;
grant select,insert,update,delete on public.member_sanction_appeals to service_role;
drop policy if exists sb_appeals_visible on public.member_sanction_appeals;
create policy sb_appeals_visible on public.member_sanction_appeals
  for select to authenticated using (
    member_id=(select auth.uid()) or exists(
      select 1 from public.site_staff_roles s where s.user_id=(select auth.uid())
        and s.role in ('owner','admin','moderator')
    )
  );

-- Códigos de verificación: nunca consultables desde el navegador.
create table if not exists public.member_appeal_email_codes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  sanction_event_id bigint not null references public.member_moderation_events(id) on delete cascade,
  code_hash text not null check(length(code_hash)=64),
  attempts integer not null default 0 check (attempts between 0 and 6),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists member_appeal_email_codes_member_time
  on public.member_appeal_email_codes(member_id,created_at desc);
alter table public.member_appeal_email_codes enable row level security;
revoke all on public.member_appeal_email_codes from public,anon,authenticated;
grant select,insert,update,delete on public.member_appeal_email_codes to service_role;
