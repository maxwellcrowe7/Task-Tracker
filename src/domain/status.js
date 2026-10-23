import { addDays, dayOfWeek, minDate, WEEKDAY_SHORT } from './dates.js'
import { periodFor } from './periods.js'
import { dailyTotals, sumRange } from './totals.js'

// The pinned date inside a period. For biweek tasks it's in the first week.
export const pinnedDate = (task, period) => addDays(period.start, task.pinned_day)

// Last on-time day. Grace never extends past the end of the period.
export const graceEnd = (task, period) =>
  minDate(addDays(pinnedDate(task, period), task.grace_days), period.end)

// A completion is late if it falls after the pinned date of its period.
export function wasLate(task, date) {
  if (task.pinned_day == null) return false
  return date > pinnedDate(task, periodFor(task, date))
}

// Status pill for a pinned chore, as of `date` (only completions up to that day count).
// Returns null for habits and unpinned chores.
//   upcoming: "Due Wed"   due: "Due today"   grace: "Due (grace until Fri)"
//   overdue: "Overdue"    done: "Done"
export function pinStatus(task, completions, date) {
  if (task.kind !== 'chore' || task.pinned_day == null) return null

  const period = periodFor(task, date)
  const due = pinnedDate(task, period)
  const until = graceEnd(task, period)
  const doneSoFar = sumRange(dailyTotals(task, completions), period.start, date)

  if (doneSoFar >= Number(task.target)) return { state: 'done', label: 'Done' }
  if (date < due) return { state: 'upcoming', label: `Due ${WEEKDAY_SHORT[dayOfWeek(due)]}` }
  if (date === due) return { state: 'due', label: 'Due today' }
  if (date <= until) return { state: 'grace', label: `Due (grace until ${WEEKDAY_SHORT[dayOfWeek(until)]})` }
  return { state: 'overdue', label: 'Overdue' }
}
