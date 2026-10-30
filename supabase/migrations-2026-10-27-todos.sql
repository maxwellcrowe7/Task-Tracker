-- One-off to-dos (the Braindump side of Upkeep). Run once in the Supabase SQL editor.
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
