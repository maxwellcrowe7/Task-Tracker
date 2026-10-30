-- To-dos now show on Today right away by default, even with a due date. Optionally
-- one can wait: until lead_days before its due date, or until show_from (a date).
-- Run once in the Supabase SQL editor.
alter table public.habit_todos alter column lead_days drop not null;
alter table public.habit_todos alter column lead_days set default null;
alter table public.habit_todos drop constraint if exists habit_todos_lead_days_check;
alter table public.habit_todos add constraint habit_todos_lead_days_check check (lead_days between 0 and 365);
update public.habit_todos set lead_days = null where lead_days is not null;
alter table public.habit_todos add column show_from date;
