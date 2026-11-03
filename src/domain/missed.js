import { addDays, minDate } from './dates.js'
import { periodFor, previousPeriod } from './periods.js'
import { pauseRangesFor, overlapsAny } from './pauses.js'
import { periodInSeason } from './season.js'
import { hasDue, dueDate, dueBeforeStart } from './due.js'
import { dailyTotals, sumRange, graceUntil } from './totals.js'

// How far back the Missed list looks, in days.
export const MISSED_LOOKBACK = 14

// The last day a period can still be done on time: the due day (plus grace for chores)
// for routines due on a set day, otherwise the end of the period.
export function closesOn(task, period) {
  if (!hasDue(task)) return period.end
  return task.kind === 'chore' ? graceUntil(task, period) : minDate(dueDate(task, period), period.end)
}

// Periods of `task` that closed in the last MISSED_LOOKBACK days without being met,
// newest first. Paused, skipped and off-season periods don't count, nor ones you've
// already dismissed (task.dismissed_misses holds their start dates). Each comes with
// the day and amount that would fill it in: { period, closes, fillDate, missing }.
export function missedPeriods(task, completions, pauses, vacations, today) {
  if (!task.active) return []
  const ranges = pauseRangesFor(task, pauses, vacations)
  const totals = dailyTotals(task, completions, undefined, ranges)
  const dismissed = new Set(task.dismissed_misses ?? [])
  const target = Number(task.target)
  const cutoff = addDays(today, -MISSED_LOOKBACK)
  const found = []
  for (let p = periodFor(task, today); p.end >= cutoff && p.end >= task.active_since; p = previousPeriod(task, p)) {
    const closes = closesOn(task, p)
    if (closes >= today || closes < cutoff || closes < task.active_since) continue
    if (dismissed.has(p.start) || dueBeforeStart(task, p) || !periodInSeason(task, p)) continue
    if (overlapsAny(ranges, p.start, p.end)) continue
    const done = sumRange(totals, p.start, p.end)
    if (done >= target) continue
    found.push({ period: p, closes, fillDate: hasDue(task) ? dueDate(task, p) : p.end, missing: target - done })
  }
  return found
}
