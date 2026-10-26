-- Remembers a declined streak-recovery offer (the start of the missed period),
-- so the app doesn't ask again about the same miss. Run once in the Supabase SQL editor.
alter table public.habit_tasks add column recovery_declined_on date;
