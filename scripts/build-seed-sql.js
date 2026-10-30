// Writes supabase/seed.sql from the same sample data demo mode uses (src/data/seed.js).
// Dates are fixed to the day you run this, so regenerate right before using it:
//   npm run seed:sql
// Then replace YOUR_EMAIL in the file and run it in the Supabase SQL editor.
import { writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { buildSampleData } from '../src/data/seed.js'
import { todayLocal } from '../src/domain/dates.js'

const today = todayLocal()
const data = buildSampleData(today)

const sql = (v) => {
  if (v == null) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

// Sample ids like 'floss' become real uuids; user_id becomes the looked-up user.
const ids = new Map(data.tasks.map((t) => [t.id, randomUUID()]))
const tagIds = new Map(data.tags.map((t) => [t.id, randomUUID()]))
const omit = new Set(['id', 'user_id', 'created_at'])

function inserts(table, rows, mapRow) {
  if (!rows.length) return ''
  const mapped = rows.map(mapRow)
  const cols = Object.keys(mapped[0])
  const values = mapped.map((r) => `    (${cols.map((c) => (c === 'user_id' ? 'uid' : r[c])).join(', ')})`)
  return `  insert into public.${table} (${cols.join(', ')}) values\n${values.join(',\n')};\n`
}

const pick = (row) => Object.fromEntries(Object.entries(row).filter(([k]) => !omit.has(k)).map(([k, v]) => [k, sql(v)]))

const body = [
  inserts('habit_tasks', data.tasks, (t) => ({ id: sql(ids.get(t.id)), user_id: 'uid', ...pick(t) })),
  inserts('habit_completions', data.completions, (c) => ({ user_id: 'uid', ...pick(c), task_id: sql(ids.get(c.task_id)), created_at: sql(c.created_at) })),
  inserts('habit_pauses', data.pauses, (p) => ({ user_id: 'uid', ...pick(p), task_id: sql(ids.get(p.task_id)) })),
  inserts('habit_vacations', data.vacations, (v) => ({ user_id: 'uid', ...pick(v) })),
  inserts('habit_tags', data.tags, (t) => ({ id: sql(tagIds.get(t.id)), user_id: 'uid', ...pick(t), parent_id: t.parent_id ? sql(tagIds.get(t.parent_id)) : 'null' })),
  inserts('habit_todos', data.todos, (t) => ({ user_id: 'uid', ...pick(t), tag_ids: `array[${t.tag_ids.map((g) => sql(tagIds.get(g))).join(', ')}]::uuid[]`, steps: `${sql(JSON.stringify(t.steps))}::jsonb` })),
].join('\n')

const file = `-- Sample data for the Habit Tracker, generated ${today} by scripts/build-seed-sql.js.
-- Optional: this fills your account with the same fake tasks and history as demo mode.
-- 1. Replace YOUR_EMAIL below with the email you log in with.
-- 2. Run this whole file in the Supabase SQL editor.
-- To remove it later: delete from public.habit_tasks where user_id = (select id from auth.users where email = 'YOUR_EMAIL');

do $$
declare
  uid uuid := (select id from auth.users where email = 'YOUR_EMAIL');
begin
  if uid is null then
    raise exception 'No Supabase user with that email. Check the email at the top of this block.';
  end if;

${body}end $$;
`

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), file)
console.log(`Wrote supabase/seed.sql (${data.tasks.length} tasks, ${data.completions.length} completions)`)
