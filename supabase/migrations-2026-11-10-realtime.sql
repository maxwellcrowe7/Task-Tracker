-- Live updates between devices: Supabase tells each open copy of Upkeep when a row
-- changes, so a check-off on your phone shows on your computer within a second or two.
-- Row-level security still applies: each account only hears about its own rows.
alter publication supabase_realtime add table
  public.habit_tasks,
  public.habit_completions,
  public.habit_pauses,
  public.habit_vacations,
  public.habit_todos,
  public.habit_tags;
