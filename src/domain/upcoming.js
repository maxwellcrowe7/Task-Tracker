import { addDays } from './dates.js'
import { periodFor } from './periods.js'
import { dueDate, hasDue, dueBeforeStart } from './due.js'
import { dailyTotals, sumRange } from './totals.js'
import { inSeason } from './season.js'

// Everything with a due date in the `days` days after `from`, soonest first, skipping
// periods already met. Each item: { task, date } (date = the due day).
export function upcomingItems(tasks, completions, from, days) {
  const items = []
  for (const task of tasks) {
    if (task.active === false || !hasDue(task)) continue
    const totals = dailyTotals(task, completions)
    for (let i = 1; i <= days; i++) {
      const date = addDays(from, i)
      if (date < task.active_since || !inSeason(task, date)) continue
      const period = periodFor(task, date)
      if (dueDate(task, period) !== date || dueBeforeStart(task, period)) continue
      if (sumRange(totals, period.start, period.end) >= Number(task.target)) continue
      items.push({ task, date })
    }
  }
  return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.task.sort_order - b.task.sort_order))
}
