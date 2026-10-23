// Dates are plain 'YYYY-MM-DD' strings in the user's local calendar.
// Arithmetic goes through a UTC day number, so time zones and DST never shift a day.
// Strings in this format sort correctly, so <, >, <=, >= compare dates directly.

const MS_PER_DAY = 86400000

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function toDayNum(date) {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / MS_PER_DAY
}

export function fromDayNum(n) {
  return new Date(n * MS_PER_DAY).toISOString().slice(0, 10)
}

export const addDays = (date, n) => fromDayNum(toDayNum(date) + n)

// Whole days from b to a (positive when a is later).
export const diffDays = (a, b) => toDayNum(a) - toDayNum(b)

// 0 = Sunday ... 6 = Saturday
export const dayOfWeek = (date) => new Date(toDayNum(date) * MS_PER_DAY).getUTCDay()

export const startOfMonth = (date) => date.slice(0, 8) + '01'

export function endOfMonth(date) {
  const [y, m] = date.split('-').map(Number)
  // Day 0 of the next month is the last day of this one.
  return fromDayNum(Date.UTC(y, m, 0) / MS_PER_DAY)
}

export const minDate = (a, b) => (a < b ? a : b)
export const maxDate = (a, b) => (a > b ? a : b)

// Today's date on this device, in local time.
export function todayLocal(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
