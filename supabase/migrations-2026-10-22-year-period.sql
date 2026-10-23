-- Adds 'year' as a task period. Run once in the Supabase SQL editor.
alter table public.habit_tasks drop constraint habit_tasks_period_check;
alter table public.habit_tasks add constraint habit_tasks_period_check
  check (period in ('day','week','biweek','month','year'));
