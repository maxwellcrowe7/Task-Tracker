import { addDays, dayOfWeek, diffDays, startOfMonth, endOfMonth } from './dates.js'

// The period ({ start, end }, inclusive) of `task` that contains `date`.
//   day:    that date
//   week:   Sunday..Saturday, fixed calendar weeks
//   biweek: 14-day blocks counted from task.period_anchor (a Sunday), in both directions
//   month:  calendar month
export function periodFor(task, date) {
  switch (task.period) {
    case 'day':
      return { start: date, end: date }
    case 'week': {
      const start = addDays(date, -dayOfWeek(date))
      return { start, end: addDays(start, 6) }
    }
    case 'biweek': {
      if (!task.period_anchor) throw new Error(`Biweekly task "${task.name}" has no period_anchor`)
      const offset = diffDays(date, task.period_anchor)
      const start = addDays(task.period_anchor, Math.floor(offset / 14) * 14)
      return { start, end: addDays(start, 13) }
    }
    case 'month':
      return { start: startOfMonth(date), end: endOfMonth(date) }
    default:
      throw new Error(`Unknown period "${task.period}"`)
  }
}

export const previousPeriod = (task, period) => periodFor(task, addDays(period.start, -1))

const UNIT_NAMES = {
  day: ['day', 'days'],
  week: ['week', 'weeks'],
  biweek: ['biweek', 'biweeks'],
  month: ['month', 'months'],
}

// "day" / "days", "week" / "weeks", ...
export const periodUnit = (task, count) => UNIT_NAMES[task.period][count === 1 ? 0 : 1]
