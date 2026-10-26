-- Adds an optional free-text notes field to each task. Run once in the Supabase SQL editor.
alter table public.habit_tasks add column notes text;
