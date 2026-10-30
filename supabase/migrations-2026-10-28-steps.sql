-- Steps: a checklist inside a to-do, saved as a list of { id, text, done }.
-- Run once in the Supabase SQL editor.
alter table public.habit_todos add column steps jsonb not null default '[]';
