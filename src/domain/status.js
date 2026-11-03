import { addDays, dayOfWeek, WEEKDAY_SHORT } from './dates.js'
import { periodFor } from './periods.js'
import { dailyTotals, sumRange, graceUntil, workingPeriod } from './totals.js'
import { dueDate, hasDue, dueBeforeStart } from './due.js'
import { formatShortDate } from '../lib/format.js'

// Monthly and yearly due-date tasks appear on Today this many days before they're due.
export const LEAD_DAYS = 3

// Last day a chore can be done for a period (its due day plus grace; can run into the next).
export const graceEnd = graceUntil

// A completion is late if it falls after the due date of the period it counts toward.
// Pass `period` when it isn't the one containing `date` (see workingPeriod).
export function wasLate(task, date, period = periodFor(task, date)) {
  if (!hasDue(task)) return false
  return date > dueDate(task, period)
}

// Status pill for a task with a due date, as of `date` (only completions up to that day count).
// Returns null for tasks without one. `ranges` (pause ranges) keep grace from a paused or
// skipped period out of the next one.
//   upcoming: "Due Wed" (or "Due Nov 10" for monthly/yearly)   due: "Due today"
//   grace: "Due (grace until Fri)"   overdue: "Overdue"   done: "Done"
export function pinStatus(task, completions, date, ranges = []) {
  if (!hasDue(task)) return null

  const period = workingPeriod(task, completions, date, ranges)
  if (dueBeforeStart(task, period)) return null
  const due = dueDate(task, period)
  const until = graceEnd(task, period)
  const doneSoFar = sumRange(dailyTotals(task, completions, undefined, ranges), period.start, date)
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
// In grace days that spill into the next period, the late one is what shows.
export function todayState(task, completions, date, ranges = []) {
  const period = workingPeriod(task, completions, date, ranges)
  const totals = dailyTotals(task, completions, undefined, ranges)
  if (sumRange(totals, period.start, date) >= Number(task.target)) {
    return completions.some((c) => c.task_id === task.id && c.date === date) ? 'done' : 'hidden'
  }
  if (!hasDue(task)) return 'open'
  if (dueBeforeStart(task, period)) return 'hidden'
  const due = dueDate(task, period)
  const last = task.kind === 'chore' ? graceEnd(task, period) : due
  return date >= addDays(due, -leadDays(task)) && date <= last ? 'open' : 'hidden'
}
