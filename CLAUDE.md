# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

Upkeep (repo: Task-Tracker, package name `habit-tracker`) — a habit, chore and to-do tracker. Vue 3 + Vue Router (hash routing) built with Vite, data in Supabase, deployed to GitHub Pages by a GitHub Action.

## Commands

- `npm run dev` — local dev server
- `npm test` — Vitest suite (also runs in CI; a failing test blocks deploy)
- `npm run build` — production build to `dist/`
- `npm run seed:sql` — regenerates `supabase/seed.sql` from the demo sample data

Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to use real data. Leave them empty to run in **demo mode** (in-memory sample data, resets on reload) — safest for UI work.

## Deploy

`.github/workflows/deploy.yml` runs on every push to `main`: `npm ci` → `npm test` → `npm run build` → publish to GitHub Pages. Supabase values come from repository secrets. **Pushing to `main` is deploying.**

## Layout

- `src/domain/` — pure logic, no Vue, no Supabase: dates, periods, due rules, status, streaks, missed periods, pauses/vacations, seasons, stats, tags, to-dos. This is where the tricky rules live, and it's what `tests/domain/` covers. Put new business logic here, not in components, and add a test for it.
- `src/data/` — state and persistence.
  - `store.js` — the shared reactive `state`. Views read from it; every change goes through the repo first.
  - `supabaseRepo.js` and `memoryRepo.js` — same interface (`load`, `insert`, `insertMany`, `update`, `remove`). Keep them in step: anything added to one must be added to the other, or demo mode breaks.
  - `seed.js` — sample data for demo mode and `seed.sql`.
- `src/lib/` — app plumbing: Supabase client (PKCE auth), auto-refresh/realtime, theme, clock, toasts.
- `src/views/` — one per route (see `src/main.js`). `src/components/` — shared UI pieces.
- `tests/` — Vitest, mirroring `src/`: `tests/domain/` for logic, `tests/data/` for store/refresh behavior, `tests/lib/` for plumbing (theme rules).
- Scratch files in the root (`mockups.html`, `desktop-mockups.html`, `shot.html`, `Upkeep.app/`) are local only and git-ignored.

## Supabase

- The project ("Personal Tools") is **shared with other apps**. Every table for this app is prefixed `habit_`. Never touch tables without that prefix.
- Every table is owner-only via RLS (`user_id = auth.uid()`), and `user_id` defaults to `auth.uid()` on insert. Any new table needs: RLS enabled, the same owner-only policy, explicit grants to `authenticated` (auto-expose is off), and adding to the realtime publication if other devices should see changes.
- `supabase/schema.sql` is the full current schema. Each change also gets a dated file, `supabase/migrations-YYYY-MM-DD-<name>.sql`. When changing the database, write the migration file AND update `schema.sql` — the user runs SQL manually in the Supabase SQL editor, so the repo is the only record of what's live.
- `supabaseRepo.js` treats a missing `habit_todos`/`habit_tags` table as empty so an un-run migration doesn't break the app. Follow that pattern for any new table.
- Only the anon/publishable key belongs in this app. Never a `service_role` key.
