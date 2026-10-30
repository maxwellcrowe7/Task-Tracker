-- "Show before": how many days ahead a task with a due date appears on Today.
-- Run once in the Supabase SQL editor.
alter table public.habit_tasks
  add column lead_days smallint not null default 1 check (lead_days between 0 and 31);
