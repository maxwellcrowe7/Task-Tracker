import { describe, it, expect } from 'vitest'
import { computeStats, formatStats } from '../../src/domain/stats.js'
import { TODAY, makeTask, done, days, pause } from './helpers.js'

const stats = (task, completions, pauses = [], vacations = []) =>
  computeStats(task, completions, pauses, vacations, TODAY)

describe('computeStats', () => {
  it('counts finished periods since active_since, leaving out the current one', () => {
    const daily = makeTask({ active_since: '2026-10-09' }) // Oct 9-18 = 10 finished days
    const history = done([...days('2026-10-09', 8), TODAY]) // Oct 9-16 + today
    expect(stats(daily, history)).toEqual({ met: 8, total: 10, late: 0 })
  })

  it('paused periods are left out of the denominator', () => {
    const daily = makeTask({ active_since: '2026-10-09' })
    const history = done(days('2026-10-09', 8))
    expect(stats(daily, history, [pause('2026-10-17', '2026-10-18')])).toEqual({ met: 8, total: 8, late: 0 })
  })

  it('a completion inside a paused period still does not count', () => {
    const daily = makeTask({ active_since: '2026-10-09' })
    const history = done(days('2026-10-09', 10))
    expect(stats(daily, history, [pause('2026-10-17', '2026-10-18')])).toEqual({ met: 8, total: 8, late: 0 })
  })

  it('counts met-but-late periods for pinned chores', () => {
    const vacuum = makeTask({ kind: 'chore', period: 'week', pinned_day: 3, grace_days: 2, active_since: '2026-09-27' })
    const history = [
      ...done(['2026-09-30'], { was_late: false }), // week of Sep 27, on Wed
      ...done(['2026-10-09'], { was_late: true }),  // week of Oct 4, late
      // week of Oct 11: missed
    ]
    expect(stats(vacuum, history)).toEqual({ met: 2, total: 3, late: 1 })
  })
})

describe('formatStats', () => {
  it('formats a raw line', () => {
    const weekly = makeTask({ period: 'week' })
    expect(formatStats(weekly, { met: 44, total: 52, late: 0 })).toBe('44 of 52 weeks met (85%)')
    expect(formatStats(weekly, { met: 1, total: 1, late: 0 })).toBe('1 of 1 week met (100%)')
  })

  it('adds lateness for pinned tasks', () => {
    const vacuum = makeTask({ kind: 'chore', period: 'week', pinned_day: 3 })
    expect(formatStats(vacuum, { met: 10, total: 12, late: 3 })).toBe('10 of 12 weeks met (83%) · 3 late')
  })

  it('handles no finished periods', () => {
    expect(formatStats(makeTask({ period: 'week' }), { met: 0, total: 0, late: 0 })).toBe('No completed week yet')
  })
})
