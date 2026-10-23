// A task is paused on a date if one of its pauses covers that date, or a vacation does
// and the task has pauses_on_vacation. A null end_date means the range is still open.

// All date ranges ({ start_date, end_date }) that pause this task.
export function pauseRangesFor(task, pauses, vacations) {
  const own = pauses.filter((p) => p.task_id === task.id)
  return task.pauses_on_vacation ? own.concat(vacations) : own
}

// True if any range overlaps [start, end].
export const overlapsAny = (ranges, start, end) =>
  ranges.some((r) => r.start_date <= end && (r.end_date == null || r.end_date >= start))

export const isPausedOn = (task, date, pauses, vacations) =>
  overlapsAny(pauseRangesFor(task, pauses, vacations), date, date)

// A period that overlaps any paused day is excluded from streaks and stats.
export const isPeriodPaused = (task, period, pauses, vacations) =>
  overlapsAny(pauseRangesFor(task, pauses, vacations), period.start, period.end)

// The task's open-ended pause (it's paused "until resumed"), if any.
export const openPause = (task, pauses) => pauses.find((p) => p.task_id === task.id && p.end_date == null)

// The vacation that is ongoing or still to come, if any. Past ones are history.
export const currentVacation = (vacations, today) =>
  vacations
    .filter((v) => v.end_date == null || v.end_date >= today)
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1))[0] ?? null
