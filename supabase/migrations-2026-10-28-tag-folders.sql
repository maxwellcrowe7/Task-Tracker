-- Tags inside tags: "football" can live inside "sports". Picking "sports" then shows
-- everything tagged with it or any tag nested under it. Run once in the Supabase SQL editor.
alter table public.habit_tags add column parent_id uuid references public.habit_tags(id) on delete set null;
