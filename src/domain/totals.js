import { addDays } from './dates.js'
import { periodFor, previousPeriod } from './periods.js'
import { hasDue, dueDate, dueBeforeStart } from './due.js'
import { overlapsAny } from './pauses.js'

// Last day a chore can still be done for `period`: its due day plus grace. Grace can run
// past the end of the period (due Saturday with a day's grace means Sunday still counts).
export function graceUntil(task, period) {
  const due = dueDate(task, period)
  return task.kind === 'chore' ? addDays(due, task.grace_days || 0) : due
}

// When `date` falls in the grace days that spill past the end of the previous period,
// that previous period (unless it was paused or skipped; `ranges` are the task's pause
// ranges). Otherwise null.
export function spillFrom(task, date, ranges = []) {
  if (task.kind !== 'chore' || !hasDue(task) || !task.grace_days) return null
  const prev = previousPeriod(task, periodFor(task, date))
  if (dueBeforeStart(task, prev) || date > graceUntil(task, prev)) return null
  if (overlapsAny(ranges, prev.start, prev.end)) return null
  return prev
}

// Map of date -> summed amount for this task's completions, ignoring anything before
// active_since. `include` optionally filters completions further.
// A completion in spill-over grace days counts toward the period it was late for, as
// long as that period still needed it: it's filed under that period's last day, so
// summing any period's dates gives what counts for it.
export function dailyTotals(task, completions, include = () => true, ranges = []) {
  const totals = new Map()
  const mine = completions.filter((c) => c.task_id === task.id && c.date >= task.active_since && include(c))
  const spills = task.kind === 'chore' && hasDue(task) && task.grace_days > 0
  if (spills) mine.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  for (const c of mine) {
    let key = c.date
    const prev = spills && spillFrom(task, c.date, ranges)
    if (prev && sumRange(totals, prev.start, prev.end) < Number(task.target)) key = prev.end
    totals.set(key, (totals.get(key) ?? 0) + Number(c.amount))
  }
  return totals
}

// The period a check-off on `date` counts toward: usually the one containing it, but in
// spill-over grace days it's the previous one, while that still needs finishing (or was
// just finished that day).
export function workingPeriod(task, completions, date, ranges = []) {
  const own = periodFor(task, date)
  const prev = spillFrom(task, date, ranges)
  if (!prev) return own
  const target = Number(task.target)
  const before = dailyTotals(task, completions, (c) => c.date < date, ranges)
  return sumRange(before, prev.start, prev.end) < target ? prev : own
}

// Sum of daily totals over [start, end], inclusive.
export function sumRange(totals, start, end) {
  let sum = 0
  for (let d = start; d <= end; d = addDays(d, 1)) sum += totals.get(d) ?? 0
  return sum
}
