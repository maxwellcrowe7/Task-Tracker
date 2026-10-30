import { describe, it, expect } from 'vitest'
import { dueDate, describeDue, nthWeekday, LAST } from '../../src/domain/due.js'
import { pinStatus, todayState, wasLate } from '../../src/domain/status.js'
import { computeStats } from '../../src/domain/stats.js'
import { periodFor } from '../../src/domain/periods.js'
import { normalizeTask, validateTask, newTaskDefaults } from '../../src/domain/taskRules.js'
import { makeTask, done } from './helpers.js'

const monthly = (o) => makeTask({ kind: 'chore', period: 'month', ...o })
const due = (task, date) => dueDate(task, periodFor(task, date))

describe('due dates', () => {
  it('Nth weekday of a month', () => {
    expect(nthWeekday('2026-11-01', 2, 2)).toBe('2026-11-10') // 2nd Tuesday
    expect(nthWeekday('2026-11-01', 0, 1)).toBe('2026-11-01') // 1st Sunday is the 1st
    expect(nthWeekday('2026-10-01', 5, LAST)).toBe('2026-10-30') // last Friday
    expect(nthWeekday('2026-11-01', 4, 4)).toBe('2026-11-26') // Thanksgiving
  })

  it('monthly: day number, short months, last day, Nth weekday', () => {
    expect(due(monthly({ due_day: 15 }), '2026-10-03')).toBe('2026-10-15')
    expect(due(monthly({ due_day: 31 }), '2026-11-03')).toBe('2026-11-30')
    expect(due(monthly({ due_day: LAST }), '2027-02-03')).toBe('2027-02-28')
    expect(due(monthly({ due_week: 2, pinned_day: 2 }), '2026-11-20')).toBe('2026-11-10')
  })

  it('yearly: a date or an Nth weekday in a month', () => {
    const year = (o) => makeTask({ period: 'year', ...o })
    expect(due(year({ due_month: 4, due_day: 15 }), '2026-10-03')).toBe('2026-04-15')
    expect(due(year({ due_month: 11, due_week: 4, pinned_day: 4 }), '2026-01-03')).toBe('2026-11-26')
    expect(due(year({ due_month: 2, due_day: LAST }), '2028-06-01')).toBe('2028-02-29')
  })

  it('weekly keeps working as before', () => {
    expect(due(makeTask({ period: 'week', pinned_day: 3 }), '2026-10-19')).toBe('2026-10-21')
  })

  it('describes the rule', () => {
    expect(describeDue(monthly({ due_week: 2, pinned_day: 2 }))).toBe('2nd Tue')
    expect(describeDue(monthly({ due_day: LAST }))).toBe('last day')
    expect(describeDue(monthly({ due_day: 15 }))).toBe('day 15')
    expect(describeDue(makeTask({ period: 'year', due_month: 4, due_day: 15 }))).toBe('Apr 15')
    expect(describeDue(makeTask({ period: 'year', due_month: 11, due_week: 4, pinned_day: 4 }))).toBe('4th Thu of Nov')
  })
})

describe('monthly due-date tasks on Today', () => {
  const pdga = monthly({ due_week: 2, pinned_day: 2, grace_days: 1 }) // 2nd Tuesday: Nov 10

  it('appear "show before" days ahead, stay through grace, then drop off as missed', () => {
    const t = { ...pdga, lead_days: 3 }
    expect(todayState(t, [], '2026-11-06')).toBe('hidden')
    expect(todayState(t, [], '2026-11-07')).toBe('open')
    expect(todayState(t, [], '2026-11-11')).toBe('open') // grace day
    expect(todayState(t, [], '2026-11-12')).toBe('hidden') // missed
    const history = done(['2026-11-09'])
    expect(todayState(t, history, '2026-11-09')).toBe('done') // under Completed that day
    expect(todayState(t, history, '2026-11-10')).toBe('hidden')
  })

  it('status pills', () => {
    expect(pinStatus(pdga, [], '2026-11-08')).toEqual({ state: 'upcoming', label: 'Due Nov 10' })
    expect(pinStatus(pdga, [], '2026-11-10').state).toBe('due')
    expect(pinStatus(pdga, [], '2026-11-11')).toEqual({ state: 'grace', label: 'Due (grace until Wed)' })
    expect(pinStatus(pdga, [], '2026-11-12').state).toBe('overdue')
  })

  it('late after the due date; grace stops at the end of the month', () => {
    const budget = monthly({ due_day: LAST, grace_days: 2 })
    expect(wasLate(budget, '2026-10-30')).toBe(false)
    expect(pinStatus(budget, [], '2026-10-31').state).toBe('due')
    expect(wasLate(pdga, '2026-11-11')).toBe(true)
  })

  it('stats count late months', () => {
    const t = { ...pdga, active_since: '2026-08-01' }
    const history = [...done(['2026-08-11'], { was_late: false }), ...done(['2026-09-09'], { was_late: true })]
    expect(computeStats(t, history, [], [], '2026-10-19')).toEqual({ met: 2, total: 2, late: 1 })
  })

  it('weekly due-day tasks use the same window (default: 1 day before)', () => {
    const vacuum = makeTask({ kind: 'chore', period: 'week', pinned_day: 3, grace_days: 1 })
    expect(todayState(vacuum, [], '2026-10-19')).toBe('hidden')
    expect(todayState(vacuum, [], '2026-10-20')).toBe('open')
    expect(todayState(vacuum, [], '2026-10-22')).toBe('open')
    expect(todayState(vacuum, [], '2026-10-23')).toBe('hidden')
  })

  it('habits get no grace after the due day', () => {
    const h = makeTask({ period: 'week', pinned_day: 3, grace_days: 0 })
    expect(todayState(h, [], '2026-10-21')).toBe('open')
    expect(todayState(h, [], '2026-10-22')).toBe('hidden')
  })
})

describe('a due date before the task started', () => {
  // Due the 2nd Tuesday (Oct 13), created Oct 23.
  const pdga = monthly({ due_week: 2, pinned_day: 2, active_since: '2026-10-23' })

  it('is not overdue and stays off Today until next month', () => {
    expect(pinStatus(pdga, [], '2026-10-23')).toBeNull()
    expect(todayState(pdga, [], '2026-10-23')).toBe('hidden')
    expect(todayState(pdga, [], '2026-11-09')).toBe('open')
  })

  it("doesn't count against stats or break the streak", () => {
    expect(computeStats(pdga, [], [], [], '2026-11-20')).toEqual({ met: 0, total: 0, late: 0 })
    expect(computeStats(pdga, [], [], [], '2026-12-20')).toEqual({ met: 0, total: 1, late: 0 })
  })

  it('weekly: created after this week\'s due day', () => {
    const vacuum = makeTask({ kind: 'chore', period: 'week', pinned_day: 3, active_since: '2026-10-22' })
    expect(pinStatus(vacuum, [], '2026-10-23')).toBeNull()
    expect(pinStatus(vacuum, [], '2026-10-26').state).toBe('upcoming')
  })
})

describe('normalizing due rules', () => {
  const base = (o) => normalizeTask({ ...newTaskDefaults('2026-10-23'), name: 'X', ...o })

  it('a monthly day number drops any weekday', () => {
    expect(base({ period: 'month', due_day: 15, pinned_day: 3 })).toMatchObject({ due_day: 15, pinned_day: null, due_week: null })
  })

  it('an Nth weekday drops any day number', () => {
    expect(base({ period: 'month', due_week: 2, pinned_day: 2, due_day: 9 })).toMatchObject({ due_week: 2, pinned_day: 2, due_day: null })
  })

  it('switching to weekly or daily clears month rules', () => {
    expect(base({ period: 'week', due_day: 15, due_month: 3, pinned_day: 1 })).toMatchObject({ due_day: null, due_month: null, pinned_day: 1 })
    expect(base({ period: 'day', pinned_day: 1 })).toMatchObject({ pinned_day: null })
  })

  it('chores keep grace with any due rule; yearly rules need a month', () => {
    expect(base({ kind: 'chore', period: 'month', due_day: LAST, grace_days: 2 }).grace_days).toBe(2)
    expect(validateTask(base({ period: 'year', due_day: 15 }))).toHaveProperty('due')
  })
})
