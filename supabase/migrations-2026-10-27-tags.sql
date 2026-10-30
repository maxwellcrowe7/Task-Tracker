-- Tags (colored labels, like Braindump's) for to-dos, and later routines.
-- Run once in the Supabase SQL editor.
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
