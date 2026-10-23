import { periodFor, previousPeriod } from './periods.js'
import { pauseRangesFor, overlapsAny } from './pauses.js'
import { dailyTotals, sumRange } from './totals.js'

// Streak for a habit, in periods. Never stored; always computed from history.
// Returns null for chores (no streak is ever shown for them).
//
// - The current period can only add: met counts 1, unfinished doesn't break anything.
// - Then walk back one period at a time. Paused periods are skipped (frozen: they
//   neither add nor break). The first unmet period stops the count.
// - Nothing before active_since counts, and the walk stops there.
export function computeStreak(task, completions, pauses, vacations, today) {
  if (task.kind !== 'habit') return null

  const totals = dailyTotals(task, completions)
  const ranges = pauseRangesFor(task, pauses, vacations)
  const target = Number(task.target)
  const isPaused = (p) => overlapsAny(ranges, p.start, p.end)
  const isMet = (p) => sumRange(totals, p.start, p.end) >= target

  let count = 0
  let period = periodFor(task, today)
  if (!isPaused(period) && isMet(period)) count++

  for (period = previousPeriod(task, period); period.end >= task.active_since; period = previousPeriod(task, period)) {
    if (isPaused(period)) continue
    if (!isMet(period)) break
    count++
  }
  return count
}
