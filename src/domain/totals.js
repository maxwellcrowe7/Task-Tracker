import { addDays } from './dates.js'

// Map of date -> summed amount for this task's completions, ignoring anything
// before active_since. `include` optionally filters completions further.
export function dailyTotals(task, completions, include = () => true) {
  const totals = new Map()
  for (const c of completions) {
    if (c.task_id !== task.id || c.date < task.active_since || !include(c)) continue
    totals.set(c.date, (totals.get(c.date) ?? 0) + Number(c.amount))
  }
  return totals
}

// Sum of daily totals over [start, end], inclusive.
export function sumRange(totals, start, end) {
  let sum = 0
  for (let d = start; d <= end; d = addDays(d, 1)) sum += totals.get(d) ?? 0
  return sum
}
