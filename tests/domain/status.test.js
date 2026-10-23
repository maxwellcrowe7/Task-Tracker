import { describe, it, expect } from 'vitest'
import { pinStatus, wasLate, graceEnd } from '../../src/domain/status.js'
import { periodFor } from '../../src/domain/periods.js'
import { makeTask, done } from './helpers.js'

// Week of Sun Oct 18 .. Sat Oct 24, 2026. Wednesday is Oct 21.
const vacuum = makeTask({ kind: 'chore', period: 'week', pinned_day: 3, grace_days: 2 })
const garbage = makeTask({ kind: 'chore', period: 'week', pinned_day: 2, grace_days: 0 })

describe('pinStatus', () => {
  it('walks through the week for a Wednesday chore with 2 days grace', () => {
    expect(pinStatus(vacuum, [], '2026-10-19')).toEqual({ state: 'upcoming', label: 'Due Wed' })
    expect(pinStatus(vacuum, [], '2026-10-21')).toEqual({ state: 'due', label: 'Due today' })
    expect(pinStatus(vacuum, [], '2026-10-22')).toEqual({ state: 'grace', label: 'Due (grace until Fri)' })
    expect(pinStatus(vacuum, [], '2026-10-23')).toEqual({ state: 'grace', label: 'Due (grace until Fri)' })
    expect(pinStatus(vacuum, [], '2026-10-24')).toEqual({ state: 'overdue', label: 'Overdue' })
  })

  it('no grace goes straight to overdue', () => {
    expect(pinStatus(garbage, [], '2026-10-21')).toEqual({ state: 'overdue', label: 'Overdue' })
  })

  it('done once the target is met, early or late', () => {
    expect(pinStatus(vacuum, done(['2026-10-19']), '2026-10-19').state).toBe('done')
    expect(pinStatus(vacuum, done(['2026-10-22']), '2026-10-23').state).toBe('done')
  })

  it('only counts completions up to the viewed day', () => {
    expect(pinStatus(vacuum, done(['2026-10-23']), '2026-10-22').state).toBe('grace')
  })

  it("last week's completion does not count this week", () => {
    expect(pinStatus(vacuum, done(['2026-10-17']), '2026-10-19').state).toBe('upcoming')
  })

  it('null for habits and unpinned chores', () => {
    expect(pinStatus(makeTask(), [], '2026-10-19')).toBeNull()
    expect(pinStatus(makeTask({ kind: 'chore', period: 'week' }), [], '2026-10-19')).toBeNull()
  })
})

describe('grace', () => {
  it('never extends past the end of the period', () => {
    const friday = makeTask({ kind: 'chore', period: 'week', pinned_day: 5, grace_days: 3 })
    expect(graceEnd(friday, periodFor(friday, '2026-10-19'))).toBe('2026-10-24')
    expect(pinStatus(friday, [], '2026-10-24').label).toBe('Due (grace until Sat)')
  })

  it('biweek pins fall in the first week', () => {
    const bi = makeTask({ kind: 'chore', period: 'biweek', period_anchor: '2026-01-04', pinned_day: 3, grace_days: 1 })
    // Biweek Oct 11-24: pinned Wed Oct 14, grace through Thu Oct 15.
    expect(pinStatus(bi, [], '2026-10-14').state).toBe('due')
    expect(pinStatus(bi, [], '2026-10-15').state).toBe('grace')
    expect(pinStatus(bi, [], '2026-10-21').state).toBe('overdue')
  })
})

describe('wasLate', () => {
  it('is true only after the pinned date', () => {
    expect(wasLate(vacuum, '2026-10-20')).toBe(false)
    expect(wasLate(vacuum, '2026-10-21')).toBe(false)
    expect(wasLate(vacuum, '2026-10-22')).toBe(true)
  })

  it('is false for unpinned tasks', () => {
    expect(wasLate(makeTask(), '2026-10-22')).toBe(false)
  })
})
