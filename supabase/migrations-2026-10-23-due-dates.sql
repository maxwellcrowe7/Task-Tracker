-- Lets monthly and yearly tasks be due on a specific day:
-- a day number or the last day (due_day), or the Nth weekday (due_week + pinned_day),
-- plus a month for yearly tasks (due_month). Run once in the Supabase SQL editor.
alter table public.habit_tasks
  add column due_day   smallint check (due_day = -1 or due_day between 1 and 31),
  add column due_week  smallint check (due_week in (-1, 1, 2, 3, 4)),
  add column due_month smallint check (due_month between 1 and 12);

alter table public.habit_tasks drop constraint pin_weekly_only;
alter table public.habit_tasks drop constraint grace_needs_pin;

alter table public.habit_tasks add constraint due_rule_shape check (
  (period = 'day' and pinned_day is null and due_day is null and due_week is null and due_month is null)
  or (period in ('week', 'biweek') and due_day is null and due_week is null and due_month is null)
  or (period in ('month', 'year')
      and (due_day is null or due_week is null)           -- a date or a weekday, not both
      and ((due_week is null) = (pinned_day is null))      -- "Nth weekday" needs its weekday
      and (period = 'year' or due_month is null)
      and (period = 'month' or (due_month is null) = (due_day is null and due_week is null)))
);
alter table public.habit_tasks add constraint grace_needs_due check (
  grace_days = 0 or pinned_day is not null or due_day is not null
);
