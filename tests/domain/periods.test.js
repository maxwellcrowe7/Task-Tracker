import { describe, it, expect } from 'vitest'
import { periodFor, previousPeriod, periodUnit } from '../../src/domain/periods.js'
import { endOfMonth, dayOfWeek } from '../../src/domain/dates.js'
import { makeTask } from './helpers.js'

describe('periodFor', () => {
  it('weeks run Sunday to Saturday', () => {
    const week = makeTask({ period: 'week' })
    expect(periodFor(week, '2026-10-18')).toEqual({ start: '2026-10-18', end: '2026-10-24' }) // Sunday
    expect(periodFor(week, '2026-10-24')).toEqual({ start: '2026-10-18', end: '2026-10-24' }) // Saturday
    expect(periodFor(week, '2026-10-25')).toEqual({ start: '2026-10-25', end: '2026-10-31' })
  })

  it('weeks cross month and year boundaries', () => {
    const week = makeTask({ period: 'week' })
    expect(periodFor(week, '2027-01-01')).toEqual({ start: '2026-12-27', end: '2027-01-02' })
  })

  it('biweeks are fixed 14-day blocks from the anchor, both directions', () => {
    const bi = makeTask({ period: 'biweek', period_anchor: '2026-01-04' })
    expect(periodFor(bi, '2026-01-04')).toEqual({ start: '2026-01-04', end: '2026-01-17' })
    expect(periodFor(bi, '2026-01-17')).toEqual({ start: '2026-01-04', end: '2026-01-17' })
    expect(periodFor(bi, '2026-01-18')).toEqual({ start: '2026-01-18', end: '2026-01-31' })
    expect(periodFor(bi, '2026-10-19')).toEqual({ start: '2026-10-11', end: '2026-10-24' })
    expect(periodFor(bi, '2026-01-03')).toEqual({ start: '2025-12-21', end: '2026-01-03' }) // before anchor
  })

  it('biweeks always start on a Sunday when the anchor does', () => {
    const bi = makeTask({ period: 'biweek', period_anchor: '2026-01-04' })
    for (const d of ['2025-06-11', '2026-03-01', '2027-08-15']) {
      expect(dayOfWeek(periodFor(bi, d).start)).toBe(0)
    }
  })

  it('biweek without an anchor throws', () => {
    expect(() => periodFor(makeTask({ period: 'biweek' }), '2026-10-19')).toThrow(/period_anchor/)
  })

  it('months are calendar months, including leap February', () => {
    const month = makeTask({ period: 'month' })
    expect(periodFor(month, '2026-10-19')).toEqual({ start: '2026-10-01', end: '2026-10-31' })
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29')
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28')
  })

  it('years are calendar years', () => {
    const year = makeTask({ period: 'year' })
    expect(periodFor(year, '2026-10-19')).toEqual({ start: '2026-01-01', end: '2026-12-31' })
    expect(previousPeriod(year, periodFor(year, '2026-01-01'))).toEqual({ start: '2025-01-01', end: '2025-12-31' })
  })

  it('previousPeriod steps back one period', () => {
    const month = makeTask({ period: 'month' })
    expect(previousPeriod(month, periodFor(month, '2026-03-15'))).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })

  it('periodUnit pluralizes', () => {
    expect(periodUnit(makeTask(), 1)).toBe('day')
    expect(periodUnit(makeTask({ period: 'week' }), 6)).toBe('weeks')
    expect(periodUnit(makeTask({ period: 'biweek' }), 3)).toBe('bi-weeks')
    expect(periodUnit(makeTask({ period: 'year' }), 2)).toBe('years')
  })
})
