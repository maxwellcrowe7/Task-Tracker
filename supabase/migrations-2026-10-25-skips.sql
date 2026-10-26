-- A skip is a one-period pause the user takes as a lifeline ("skip today / this week").
-- Stored as a pause row covering that period, flagged so the app can show "Skipped".
-- Run once in the Supabase SQL editor.
alter table public.habit_pauses add column is_skip boolean not null default false;
