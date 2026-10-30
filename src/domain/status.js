import { addDays, dayOfWeek, minDate, WEEKDAY_SHORT } from './dates.js'
import { periodFor } from './periods.js'
import { dailyTotals, sumRange } from './totals.js'
import { dueDate, hasDue, dueBeforeStart } from './due.js'
import { formatShortDate } from '../lib/format.js'

// Monthly and yearly due-date tasks appear on Today this many days before they're due.
export const LEAD_DAYS = 3

// Last on-time day. Grace never extends past the end of the period.
export const graceEnd = (task, period) => minDate(addDays(dueDate(task, period), task.grace_days), period.end)

// A completion is late if it falls after the due date of its period.
export function wasLate(task, date) {
  if (!hasDue(task)) return false
  return date > dueDate(task, periodFor(task, date))
}

// Status pill for a task with a due date, as of `date` (only completions up to that day count).
// Returns null for tasks without one.
//   upcoming: "Due Wed" (or "Due Nov 10" for monthly/yearly)   due: "Due today"
//   grace: "Due (grace until Fri)"   overdue: "Overdue"   done: "Done"
export function pinStatus(task, completions, date) {
  if (!hasDue(task)) return null

  const period = periodFor(task, date)
  if (dueBeforeStart(task, period)) return null
  const due = dueDate(task, period)
  const until = graceEnd(task, period)
  const doneSoFar = sumRange(dailyTotals(task, completions), period.start, date)
  const weekly = task.period === 'week' || task.period === 'biweek'

  if (doneSoFar >= Number(task.target)) return { state: 'done', label: 'Done' }
  if (date < due) return { state: 'upcoming', label: `Due ${weekly ? WEEKDAY_SHORT[dayOfWeek(due)] : formatShortDate(due)}` }
  if (date === due) return { state: 'due', label: 'Due today' }
  if (date <= until) return { state: 'grace', label: `Due (grace until ${WEEKDAY_SHORT[dayOfWeek(until)]})` }
  return { state: 'overdue', label: 'Overdue' }
}

// Default "show before" days for tasks saved before lead_days existed.
export const DEFAULT_LEAD_DAYS = 1
export const leadDays = (task) => task.lead_days ?? DEFAULT_LEAD_DAYS

// Where a task stands on the Today list for `date`:
//   'open'   — still to do: shows in the main list
//   'done'   — finished, and something was logged that day: shows under Completed
//   'hidden' — not on Today (already finished earlier this period, not in its window yet,
//              or its window has passed and it counts as a miss)
// Tasks with a due date appear `lead_days` ahead and stay through the due day (plus grace
// for chores). Everything else (daily habits, counted goals like 4×/week) stays all period
// until it's met.
export function todayState(task, completions, date) {
  const period = periodFor(task, date)
  const totals = dailyTotals(task, completions)
  if (sumRange(totals, period.start, date) >= Number(task.target)) {
    return totals.has(date) ? 'done' : 'hidden'
  }
  if (!hasDue(task)) return 'open'
  if (dueBeforeStart(task, period)) return 'hidden'
  const due = dueDate(task, period)
  const last = task.kind === 'chore' ? graceEnd(task, period) : due
  return date >= addDays(due, -leadDays(task)) && date <= last ? 'open' : 'hidden'
}
