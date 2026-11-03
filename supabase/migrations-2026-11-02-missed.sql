-- Missed list: misses you've dismissed ("I missed it"), by the start date of the period.
-- Run once in the Supabase SQL editor.
alter table public.habit_tasks add column dismissed_misses date[] not null default '{}';
