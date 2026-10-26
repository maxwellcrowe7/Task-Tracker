import { periodFor, previousPeriod } from './periods.js'
import { pauseRangesFor, overlapsAny } from './pauses.js'
import { periodInSeason } from './season.js'
import { dueBeforeStart, dueDate } from './due.js'
import { dailyTotals, sumRange } from './totals.js'

// Shared pieces for walking a habit's history period by period.
function streakParts(task, completions, pauses, vacations) {
  const totals = dailyTotals(task, completions)
  const ranges = pauseRangesFor(task, pauses, vacations)
  const target = Number(task.target)
  // Paused, off-season, and due-before-the-task-started periods are skipped: frozen, not broken.
  const isSkipped = (p) => overlapsAny(ranges, p.start, p.end) || !periodInSeason(task, p) || dueBeforeStart(task, p)
  const amountIn = (p) => sumRange(totals, p.start, p.end)
  const isMet = (p) => amountIn(p) >= target

  // Met periods counted backward from `period` (inclusive) until the first miss.
  function countBack(period) {
    let count = 0
    for (let p = period; p.end >= task.active_since; p = previousPeriod(task, p)) {
      if (isSkipped(p)) continue
      if (!isMet(p)) break
      count++
    }
    return count
  }
  return { target, isSkipped, isMet, amountIn, countBack }
}

// Streak for a habit, in periods. Never stored; always computed from history.
// Returns null for chores (no streak is ever shown for them).
//
// - The current period can only add: met counts 1, unfinished doesn't break anything.
// - Then walk back one period at a time. Skipped periods (paused, off-season) neither
//   add nor break. The first unmet period stops the count.
// - Nothing before active_since counts, and the walk stops there.
export function computeStreak(task, completions, pauses, vacations, today) {
  if (task.kind !== 'habit') return null
  const { isSkipped, isMet, countBack } = streakParts(task, completions, pauses, vacations)
  const current = periodFor(task, today)
  const now = !isSkipped(current) && isMet(current) ? 1 : 0
  return now + countBack(previousPeriod(task, current))
}

// Streak recovery: if the last finished period was missed and the periods before it
// were a streak, offer to fill in that one missed period. Only a single missed period
// can be recovered (two misses in a row means there's no streak left to save), and
// not one the user already declined (task.recovery_declined_on = that period's start).
// Returns { period, streak, missing, fillDate } or null.
export function recoveryOffer(task, completions, pauses, vacations, today) {
  if (task.kind !== 'habit') return null
  const { target, isSkipped, isMet, amountIn, countBack } = streakParts(task, completions, pauses, vacations)

  let missed = previousPeriod(task, periodFor(task, today))
  while (missed.end >= task.active_since && isSkipped(missed)) missed = previousPeriod(task, missed)
  if (missed.end < task.active_since || isMet(missed)) return null
  if (task.recovery_declined_on === missed.start) return null

  const streak = countBack(previousPeriod(task, missed))
  if (streak === 0) return null

  return {
    period: missed,
    streak,
    missing: target - amountIn(missed),
    // Log the fill-in on the due day when there is one (so it isn't marked late), else the last day.
    fillDate: dueDate(task, missed) ?? missed.end,
  }
}

// Backdating an existing streak (e.g. a 312-day Duolingo streak from before using this
// app): fill in the `count` periods before today's, skipping paused / off-season ones,
// topping up any that are already partly logged. Returns the completions to add
// ({ date, amount }) and the start date the task needs so they count.
export function backdatePlan(task, completions, pauses, vacations, today, count) {
  const open = { ...task, active_since: '0001-01-01' } // nothing earlier is ignored while planning
  const { target, isSkipped, amountIn } = streakParts(open, completions, pauses, vacations)
  const rows = []
  let earliest = task.active_since
  let filled = 0
  let p = previousPeriod(task, periodFor(task, today))
  for (let guard = 0; filled < count && guard < 20000; guard++, p = previousPeriod(task, p)) {
    if (isSkipped(p)) continue
    const missing = target - amountIn(p)
    const date = dueDate(open, p) ?? p.end
    if (missing > 0) {
      if (task.unit_type === 'quantity') rows.push({ date, amount: missing })
      else for (let i = 0; i < missing; i++) rows.push({ date, amount: 1 })
    }
    if (p.start < earliest) earliest = p.start
    filled++
  }
  return { rows, activeSince: earliest }
}
