import { addDays, dayOfWeek, endOfMonth, WEEKDAY_SHORT } from './dates.js'

// A task can be due on a specific day inside each of its periods:
//   week / biweek: pinned_day (0 = Sunday); biweeks use the first week
//   month:         due_day (1–31, or -1 = last day), or due_week + pinned_day
//                  (Nth weekday: 1–4, or -1 = last), e.g. 2nd Tuesday
//   year:          due_month (1–12) plus either of the month rules above
// Day numbers past the end of a short month fall on its last day.

export const LAST = -1

export function hasDue(task) {
  if (task.period === 'week' || task.period === 'biweek') return task.pinned_day != null
  if (task.period === 'month') return task.due_day != null || task.due_week != null
  if (task.period === 'year') return task.due_month != null && (task.due_day != null || task.due_week != null)
  return false
}

// The Nth `weekday` of the month containing `monthStart` (n = -1 for the last one).
export function nthWeekday(monthStart, weekday, n) {
  if (n === LAST) {
    const last = endOfMonth(monthStart)
    return addDays(last, -((dayOfWeek(last) - weekday + 7) % 7))
  }
  const first = addDays(monthStart, (weekday - dayOfWeek(monthStart) + 7) % 7)
  return addDays(first, 7 * (n - 1))
}

function dueInMonth(task, monthStart) {
  if (task.due_week != null) return nthWeekday(monthStart, task.pinned_day, task.due_week)
  const last = endOfMonth(monthStart)
  if (task.due_day === LAST) return last
  return addDays(monthStart, Math.min(task.due_day, Number(last.slice(8))) - 1)
}

// The due date inside `period`, or null if the task has no due rule.
export function dueDate(task, period) {
  if (!hasDue(task)) return null
  switch (task.period) {
    case 'week':
    case 'biweek':
      return addDays(period.start, task.pinned_day)
    case 'month':
      return dueInMonth(task, period.start)
    case 'year':
      return dueInMonth(task, `${period.start.slice(0, 4)}-${String(task.due_month).padStart(2, '0')}-01`)
  }
}

// True when a period's due date came before the task started (e.g. a monthly task
// due on the 13th, created on the 23rd). That period doesn't apply: no Overdue,
// and streaks and stats skip it.
export function dueBeforeStart(task, period) {
  const due = dueDate(task, period)
  return due != null && due < task.active_since
}

const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', [LAST]: 'last' }
const MONTH_SHORT = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'short' }),
)

// Short description for lists: "Wed", "the 15th", "last day", "2nd Tue", "Apr 15", "4th Thu of Nov".
export function describeDue(task) {
  if (!hasDue(task)) return ''
  if (task.period === 'week' || task.period === 'biweek') return WEEKDAY_SHORT[task.pinned_day]
  const inMonth =
    task.due_week != null
      ? `${ORDINAL[task.due_week]} ${WEEKDAY_SHORT[task.pinned_day]}`
      : task.due_day === LAST
        ? 'last day'
        : task.period === 'year'
          ? String(task.due_day)
          : `day ${task.due_day}`
  if (task.period === 'month') return inMonth
  const month = MONTH_SHORT[task.due_month - 1]
  if (task.due_week != null) return `${inMonth} of ${month}`
  return task.due_day === LAST ? `last day of ${month}` : `${month} ${task.due_day}`
}
