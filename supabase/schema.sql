-- Habit & Chore Tracker v0.1 schema.
-- Run once in the Supabase SQL editor. Tables are prefixed habit_ because the
-- Supabase project is shared with other apps. Every table is owner-only via RLS.

-- ========== tasks ==========
create table public.habit_tasks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name               text not null check (length(trim(name)) > 0),
  kind               text not null check (kind in ('habit','chore')),
  period             text not null check (period in ('day','week','biweek','month')),
  period_anchor      date,
  target             numeric not null check (target > 0),
  unit_type          text not null default 'occurrence' check (unit_type in ('occurrence','quantity')),
  unit_label         text,
  quick_add          numeric not null default 1 check (quick_add > 0),
  pinned_day         smallint check (pinned_day between 0 and 6),
  grace_days         smallint not null default 0 check (grace_days between 0 and 6),
  active             boolean not null default true,
  active_since       date not null default current_date,
  pauses_on_vacation boolean not null default false,
  scope              text not null default 'personal' check (scope in ('work','personal')),
  subtag             text,
  season_start       date,
  season_end         date,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now(),

  unique (id, user_id),  -- target for the composite foreign keys below
  constraint habit_no_grace      check (kind <> 'habit' or grace_days = 0),
  constraint biweek_needs_anchor check (period <> 'biweek' or period_anchor is not null),
  constraint anchor_is_sunday    check (period_anchor is null or extract(dow from period_anchor) = 0),
  constraint pin_weekly_only     check (pinned_day is null or period in ('week','biweek')),
  constraint grace_needs_pin     check (grace_days = 0 or pinned_day is not null),
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
