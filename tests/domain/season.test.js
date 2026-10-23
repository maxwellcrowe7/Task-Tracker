import { describe, it, expect } from 'vitest'
import { inSeason, periodInSeason } from '../../src/domain/season.js'
import { computeStreak } from '../../src/domain/streak.js'
import { computeStats } from '../../src/domain/stats.js'
import { periodFor } from '../../src/domain/periods.js'
import { normalizeTask, newTaskDefaults } from '../../src/domain/taskRules.js'
import { TODAY, makeTask, done } from './helpers.js'

const summer = { season_start: '2000-05-01', season_end: '2000-09-30' }
const winter = { season_start: '2000-11-01', season_end: '2000-03-15' }

describe('inSeason', () => {
  it('year-round tasks are always in season', () => {
    expect(inSeason(makeTask(), '2026-01-01')).toBe(true)
  })

  it('a summer season, inclusive at both ends, every year', () => {
    const t = makeTask(summer)
    expect(inSeason(t, '2026-04-30')).toBe(false)
    expect(inSeason(t, '2026-05-01')).toBe(true)
    expect(inSeason(t, '2031-09-30')).toBe(true)
    expect(inSeason(t, '2026-10-01')).toBe(false)
  })

  it('a winter season wraps past New Year', () => {
    const t = makeTask(winter)
    expect(inSeason(t, '2026-12-25')).toBe(true)
    expect(inSeason(t, '2027-03-15')).toBe(true)
    expect(inSeason(t, '2027-03-16')).toBe(false)
    expect(inSeason(t, '2026-10-31')).toBe(false)
  })

  it('a period counts if any day of it is in season', () => {
    const t = makeTask({ ...summer, period: 'week' })
    expect(periodInSeason(t, periodFor(t, '2026-09-30'))).toBe(true) // Sep 27 – Oct 3
    expect(periodInSeason(t, periodFor(t, '2026-10-05'))).toBe(false)
    const yearly = makeTask({ ...summer, period: 'year' })
    expect(periodInSeason(yearly, periodFor(yearly, '2026-10-05'))).toBe(true)
  })
})

describe('seasons in streaks and stats', () => {
  // Weekly, May–Sep. Today (Oct 19) and the two weeks before are off-season.
  const putting = makeTask({ ...summer, period: 'week', active_since: '2026-08-30' })
  const history = done(['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'])

  it('the streak carries through the off-season', () => {
    expect(computeStreak(putting, history, [], [], TODAY)).toBe(5)
  })

  it('off-season weeks are left out of the stats', () => {
    expect(computeStats(putting, history, [], [], TODAY)).toEqual({ met: 5, total: 5, late: 0 })
  })
})

describe('normalizeTask seasons', () => {
  const base = (o) => ({ ...newTaskDefaults('2026-10-19'), name: 'X', ...o })
  it('needs both ends, otherwise year-round', () => {
    expect(normalizeTask(base({ season_start: '2000-05-01', season_end: null }))).toMatchObject({ season_start: null, season_end: null })
    expect(normalizeTask(base(summer))).toMatchObject(summer)
  })
})
