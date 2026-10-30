import { addDays, diffDays, dayOfWeek, WEEKDAY_SHORT } from './dates.js'
import { formatShortDate } from '../lib/format.js'

// One-off to-dos. done_on is the local date it was checked off (null = open).

// When a to-do starts showing on Today. By default it shows right away, even with a
// due date far off (to-dos can be done early). Optionally it stays hidden until
// `show_from` (a date) or until `lead_days` before its due date. A step due sooner
// brings it in on that step's date. Returns a date, or null = showing now.
export function showsFrom(todo) {
  let from = null
  if (todo.show_from) from = todo.show_from
  else if (todo.lead_days != null && todo.due_date) from = addDays(todo.due_date, -todo.lead_days)
  const step = nextStepDue(todo)
  if (from && step && step < from) from = step
  return from
}

// Where a to-do stands on the Today list for `date`:
//   'done'   — checked off that day (shows under Completed)
//   'open'   — on today's list (see showsFrom)
//   'hidden' — otherwise (open to-dos only appear on the real today, not past days)
export function todoState(todo, date, today) {
  if (todo.done_on) return todo.done_on === date ? 'done' : 'hidden'
  if (date !== today) return 'hidden'
  const from = showsFrom(todo)
  return !from || date >= from ? 'open' : 'hidden'
}

// Short due label: { text, tone } with tone 'late' | 'due' | ''.
export function dueLabel(todo, today) {
  if (!todo.due_date || todo.done_on) return null
  const days = diffDays(todo.due_date, today)
  if (days < 0) return { text: `Overdue · ${formatShortDate(todo.due_date)}`, tone: 'late' }
  if (days === 0) return { text: 'Today', tone: 'late' }
  if (days === 1) return { text: 'Tomorrow', tone: 'due' }
  if (days < 7) return { text: WEEKDAY_SHORT[dayOfWeek(todo.due_date)], tone: '' }
  return { text: formatShortDate(todo.due_date), tone: '' }
}

// Dated first (soonest first), then undated. Within the same due date (or among the
// undated), flagged ones come first, then the order they were added.
export function sortTodos(todos) {
  const flagged = (t) => (t.priority === 'high' ? 0 : 1)
  return [...todos].sort((a, b) => {
    if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1
    return flagged(a) - flagged(b) || a.sort_order - b.sort_order || (a.created_at < b.created_at ? -1 : 1)
  })
}

// Steps (a checklist inside a to-do): { id, text, done, due_date? }. Progress for the
// list row, or null when there are none.
export function stepProgress(todo) {
  const steps = todo.steps ?? []
  return steps.length ? { done: steps.filter((s) => s.done).length, total: steps.length } : null
}

export const newStep = (text) => ({ id: crypto.randomUUID(), text, done: false })

// The earliest due date among unfinished steps, or null.
export function nextStepDue(todo) {
  const dates = (todo.steps ?? []).filter((s) => !s.done && s.due_date).map((s) => s.due_date)
  return dates.length ? dates.sort()[0] : null
}

export const allStepsDone = (todo) => (todo.steps ?? []).length > 0 && todo.steps.every((s) => s.done)
