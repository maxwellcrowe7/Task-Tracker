import { describe, it, expect } from 'vitest'
import { dailyTotals, sumRange, workingPeriod } from '../../src/domain/totals.js'
import { todayState, pinStatus } from '../../src/domain/status.js'
import { computeStats } from '../../src/domain/stats.js'
import { missedPeriods } from '../../src/domain/missed.js'
import { periodFor } from '../../src/domain/periods.js'
import { makeTask, done } from './helpers.js'

// Laundry: weekly, due Saturday, one day's grace (so Sunday of the next week).
// Week of Sun Oct 18 .. Sat Oct 24, 2026; next week starts Sun Oct 25.
const laundry = makeTask({ kind: 'chore', period: 'week', pinned_day: 6, grace_days: 1, active_since: '2026-10-01', active: true })
const lastWeek = periodFor(laundry, '2026-10-24')
const thisWeek = periodFor(laundry, '2026-10-25')

describe('grace that runs into the next week', () => {
  it('counts a Sunday check-off toward the week it was late for', () => {
    const totals = dailyTotals(laundry, done(['2026-10-25']))
    expect(sumRange(totals, lastWeek.start, lastWeek.end)).toBe(1)
    expect(sumRange(totals, thisWeek.start, thisWeek.end)).toBe(0)
  })

  it('counts it toward the new week when last week was already done', () => {
    const totals = dailyTotals(laundry, done(['2026-10-24', '2026-10-25']))
    expect(sumRange(totals, lastWeek.start, lastWeek.end)).toBe(1)
    expect(sumRange(totals, thisWeek.start, thisWeek.end)).toBe(1)
  })

  it("doesn't carry into a week that was skipped", () => {
    const ranges = [{ start_date: lastWeek.start, end_date: lastWeek.end }]
    const totals = dailyTotals(laundry, done(['2026-10-25']), undefined, ranges)
    expect(sumRange(totals, thisWeek.start, thisWeek.end)).toBe(1)
  })

  it('shows last week on Sunday until it is done, then the new week', () => {
    expect(workingPeriod(laundry, [], '2026-10-25')).toEqual(lastWeek)
    expect(todayState(laundry, [], '2026-10-25')).toBe('open')
    expect(pinStatus(laundry, [], '2026-10-25')).toEqual({ state: 'grace', label: 'Due (grace until Sun)' })
    // Checked off on Sunday: done for that day, under Completed.
    expect(todayState(laundry, done(['2026-10-25']), '2026-10-25')).toBe('done')
    // Monday: grace is over; the new week isn't in its window yet.
    expect(todayState(laundry, [], '2026-10-26')).toBe('hidden')
    expect(workingPeriod(laundry, [], '2026-10-26')).toEqual(thisWeek)
  })

  it('treats a missed Saturday as missed only after Sunday', () => {
    expect(missedPeriods(laundry, [], [], [], '2026-10-25').map((m) => m.closes)).not.toContain('2026-10-25')
    expect(missedPeriods(laundry, [], [], [], '2026-10-26')[0]).toMatchObject({ closes: '2026-10-25', fillDate: '2026-10-24' })
    expect(missedPeriods(laundry, done(['2026-10-25']), [], [], '2026-10-26').map((m) => m.closes)).not.toContain('2026-10-25')
  })

  it('counts Sunday as met but late in stats', () => {
    const late = [{ task_id: laundry.id, date: '2026-10-25', amount: 1, was_late: true }]
    const stats = computeStats(laundry, late, [], [], '2026-11-02')
    expect(stats.late).toBeGreaterThanOrEqual(1)
  })
})
