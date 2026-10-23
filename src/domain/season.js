import { addDays } from './dates.js'

// A seasonal task is only "on" between two dates that repeat every year, e.g.
// May 1 – Sep 30 for mowing, or Nov 1 – Mar 15 for shoveling (wraps past New Year).
// season_start / season_end are stored as dates in the year 2000; only month-day matters.
// 2000 is a leap year, so Feb 29 works.

export const SEASON_YEAR = '2000'

export const hasSeason = (task) => task.season_start != null && task.season_end != null

const monthDay = (date) => date.slice(5) // 'MM-DD'

export function inSeason(task, date) {
  if (!hasSeason(task)) return true
  const d = monthDay(date)
  const start = monthDay(task.season_start)
  const end = monthDay(task.season_end)
  return start <= end ? d >= start && d <= end : d >= start || d <= end
}

// Periods entirely outside the season are skipped by streaks and stats, like paused
// ones: they neither count nor break anything. A period with any in-season day counts.
export function periodInSeason(task, period) {
  if (!hasSeason(task)) return true
  for (let d = period.start; d <= period.end; d = addDays(d, 1)) {
    if (inSeason(task, d)) return true
  }
  return false
}
