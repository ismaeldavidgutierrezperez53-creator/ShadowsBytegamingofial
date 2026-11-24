-- Meta personal semanal gaming. No modifica ni publica las sesiones.
create table if not exists public.member_gaming_weekly_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_minutes integer not null default 300
    check (target_minutes between 30 and 2400 and target_minutes % 30 = 0),
  updated_at timestamptz not null default now()
);
alter table public.member_gaming_weekly_goals enable row level security;
revoke all on public.member_gaming_weekly_goals from anon;
grant select,insert,update on public.member_gaming_weekly_goals to authenticated;
create policy gaming_weekly_goals_select_own
 on public.member_gaming_weekly_goals for select to authenticated
 using (user_id=(select auth.uid()));
create policy gaming_weekly_goals_insert_own
 on public.member_gaming_weekly_goals for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy gaming_weekly_goals_update_own
 on public.member_gaming_weekly_goals for update to authenticated
 using (user_id=(select auth.uid()))
 with check (user_id=(select auth.uid()));
