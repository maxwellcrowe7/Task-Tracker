-- Habit & Chore Tracker v0.1 schema.
-- Run once in the Supabase SQL editor. Tables are prefixed habit_ because the
-- Supabase project is shared with other apps. Every table is owner-only via RLS.

-- ========== tasks ==========
create table public.habit_tasks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name               text not null check (length(trim(name)) > 0),
  kind               text not null check (kind in ('habit','chore')),
  period             text not null check (period in ('day','week','biweek','month','year')),
  period_anchor      date,
  target             numeric not null check (target > 0),
  unit_type          text not null default 'occurrence' check (unit_type in ('occurrence','quantity')),
  unit_label         text,
  quick_add          numeric not null default 1 check (quick_add > 0),
  pinned_day         smallint check (pinned_day between 0 and 6),   -- weekday, 0 = Sunday
  due_day            smallint check (due_day = -1 or due_day between 1 and 31),  -- -1 = last day
  due_week           smallint check (due_week in (-1, 1, 2, 3, 4)),  -- Nth weekday, -1 = last
  due_month          smallint check (due_month between 1 and 12),
  grace_days         smallint not null default 0 check (grace_days between 0 and 6),  -- after the due day (chores)
  lead_days          smallint not null default 1 check (lead_days between 0 and 31),  -- shows on Today this many days before
  active             boolean not null default true,
  active_since       date not null default current_date,
  pauses_on_vacation boolean not null default false,
  scope              text not null default 'personal' check (scope in ('work','personal')),
  subtag             text,
  notes              text,
  recovery_declined_on date,  -- missed period the user chose not to fill in (streak recovery)
  season_start       date,
  season_end         date,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now(),

  unique (id, user_id),  -- target for the composite foreign keys below
  constraint habit_no_grace      check (kind <> 'habit' or grace_days = 0),
  constraint biweek_needs_anchor check (period <> 'biweek' or period_anchor is not null),
  constraint anchor_is_sunday    check (period_anchor is null or extract(dow from period_anchor) = 0),
  constraint due_rule_shape      check (
    (period = 'day' and pinned_day is null and due_day is null and due_week is null and due_month is null)
    or (period in ('week', 'biweek') and due_day is null and due_week is null and due_month is null)
    or (period in ('month', 'year')
        and (due_day is null or due_week is null)
        and ((due_week is null) = (pinned_day is null))
        and (period = 'year' or due_month is null)
        and (period = 'month' or (due_month is null) = (due_day is null and due_week is null)))),
  constraint grace_needs_due     check (grace_days = 0 or pinned_day is not null or due_day is not null),
  constraint occurrence_whole    check (unit_type <> 'occurrence' or (quick_add = 1 and target = trunc(target)))
);

-- ========== completions (one row per completion) ==========
create table public.habit_completions (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null,
  user_id    uuid not null default auth.uid(),
  date       date not null,
  amount     numeric not null default 1 check (amount > 0),
  was_late   boolean not null default false,
  note       text,
  created_at timestamptz not null default now(),
  -- Composite key: a completion can only point at one of your own tasks.
  foreign key (task_id, user_id) references public.habit_tasks(id, user_id) on delete cascade
);
create index habit_completions_task_date on public.habit_completions (task_id, date);

-- ========== pauses ==========
create table public.habit_pauses (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null,
  user_id    uuid not null default auth.uid(),
  start_date date not null,
  end_date   date,                      -- null = still paused
  is_skip    boolean not null default false,  -- one-period "skip" lifeline from the Today view
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  foreign key (task_id, user_id) references public.habit_tasks(id, user_id) on delete cascade
);
create index habit_pauses_task on public.habit_pauses (task_id);

-- ========== vacations ==========
create table public.habit_vacations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  start_date date not null,
  end_date   date,                      -- null = ongoing, end manually
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

-- ========== Access ==========
-- Signed-in users may use these tables; RLS below limits them to their own rows.
-- Signed-out visitors get no access at all.
grant select, insert, update, delete on
  public.habit_tasks, public.habit_completions, public.habit_pauses, public.habit_vacations
  to authenticated;

-- ========== RLS: owner-only on every table ==========
alter table public.habit_tasks       enable row level security;
alter table public.habit_completions enable row level security;
alter table public.habit_pauses      enable row level security;
alter table public.habit_vacations   enable row level security;

create policy owner_all on public.habit_tasks       for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy owner_all on public.habit_completions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy owner_all on public.habit_pauses      for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy owner_all on public.habit_vacations   for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ========== to-dos ==========
create table public.habit_todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scope      text not null default 'personal' check (scope in ('work', 'personal')),
  title      text not null check (length(trim(title)) > 0),
  notes      text,
  due_date   date,                                   -- optional
  lead_days  smallint not null default 1 check (lead_days between 0 and 31),  -- shows on Today this many days before
  priority   text check (priority in ('low', 'medium', 'high')),
  done_on    date,                                   -- local date it was checked off; null = still open
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index habit_todos_user on public.habit_todos (user_id, done_on);

grant select, insert, update, delete on public.habit_todos to authenticated;
alter table public.habit_todos enable row level security;
create policy owner_all on public.habit_todos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ========== tags ==========
create table public.habit_tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  color      text not null default 'slate',            -- one of the palette ids in src/domain/tags.js
  scope      text not null default 'both' check (scope in ('personal', 'work', 'both')),
  fav        boolean not null default false,           -- shown as a one-tap chip in the add bar
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.habit_tags to authenticated;
alter table public.habit_tags enable row level security;
create policy owner_all on public.habit_tags for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.habit_todos add column tag_ids uuid[] not null default '{}';
alter table public.habit_tasks add column tag_ids uuid[] not null default '{}';

-- Tags inside tags: "football" can live inside "sports". Picking "sports" then shows
-- everything tagged with it or any tag nested under it. Run once in the Supabase SQL editor.
alter table public.habit_tags add column parent_id uuid references public.habit_tags(id) on delete set null;

-- Steps: a checklist inside a to-do, saved as a list of { id, text, done }.
-- Run once in the Supabase SQL editor.
alter table public.habit_todos add column steps jsonb not null default '[]';

-- To-dos now show on Today right away by default, even with a due date. Optionally
-- one can wait: until lead_days before its due date, or until show_from (a date).
-- Run once in the Supabase SQL editor.
alter table public.habit_todos alter column lead_days drop not null;
alter table public.habit_todos alter column lead_days set default null;
alter table public.habit_todos drop constraint if exists habit_todos_lead_days_check;
alter table public.habit_todos add constraint habit_todos_lead_days_check check (lead_days between 0 and 365);
update public.habit_todos set lead_days = null where lead_days is not null;
alter table public.habit_todos add column show_from date;
