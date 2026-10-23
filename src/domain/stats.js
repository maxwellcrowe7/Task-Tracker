import { periodFor, previousPeriod, periodUnit } from './periods.js'
import { pauseRangesFor, overlapsAny } from './pauses.js'
import { periodInSeason } from './season.js'
import { dailyTotals, sumRange } from './totals.js'

// Raw counts over finished periods since active_since. The in-progress current
// period and any paused or off-season period are left out of both numbers.
// `late` counts met periods that were only met thanks to was_late completions
// (pinned tasks only). Independent of the streak.
export function computeStats(task, completions, pauses, vacations, today) {
  const totals = dailyTotals(task, completions)
  const onTime = dailyTotals(task, completions, (c) => !c.was_late)
  const ranges = pauseRangesFor(task, pauses, vacations)
  const target = Number(task.target)
  const pinned = task.pinned_day != null

  let met = 0
  let total = 0
  let late = 0
  for (
    let p = previousPeriod(task, periodFor(task, today));
    p.end >= task.active_since;
    p = previousPeriod(task, p)
  ) {
    if (overlapsAny(ranges, p.start, p.end) || !periodInSeason(task, p)) continue
    total++
    if (sumRange(totals, p.start, p.end) >= target) {
      met++
      if (pinned && sumRange(onTime, p.start, p.end) < target) late++
    }
  }
  return { met, total, late }
}

// "44 of 52 weeks met (85%)", plus " · 3 late" for pinned tasks.
export function formatStats(task, { met, total, late }) {
  if (total === 0) return `No completed ${periodUnit(task, 1)} yet`
  const pct = Math.round((met / total) * 100)
  let line = `${met} of ${total} ${periodUnit(task, total)} met (${pct}%)`
  if (task.pinned_day != null && late > 0) line += ` · ${late} late`
  return line
}
