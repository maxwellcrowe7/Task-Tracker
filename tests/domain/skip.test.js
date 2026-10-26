import { describe, it, expect } from 'vitest'
import { computeStreak, recoveryOffer } from '../../src/domain/streak.js'
import { computeStats } from '../../src/domain/stats.js'
import { skipOn, openPause } from '../../src/domain/pauses.js'
import { TODAY, makeTask, done, days } from './helpers.js'

const skip = (start_date, end_date = start_date) => ({ task_id: 't1', start_date, end_date, is_skip: true })

describe('skips', () => {
  const daily = makeTask({ active_since: '2026-10-10' })
  const history = done([...days('2026-10-10', 7), '2026-10-18']) // Oct 17 missed

  it('a skipped day keeps the streak without adding to it', () => {
    expect(computeStreak(daily, history, [], [], TODAY)).toBe(1)
    expect(computeStreak(daily, history, [skip('2026-10-17')], [], TODAY)).toBe(8)
  })

  it('a skipped day is left out of the stats', () => {
    expect(computeStats(daily, history, [skip('2026-10-17')], [], TODAY)).toEqual({ met: 8, total: 8, late: 0 })
  })

  it('a skipped week covers the whole week', () => {
    const weekly = makeTask({ period: 'week', active_since: '2026-09-27' })
    const h = done(['2026-09-28', '2026-10-13'])
    expect(computeStreak(weekly, h, [skip('2026-10-04', '2026-10-10')], [], TODAY)).toBe(2)
    expect(skipOn(weekly, '2026-10-07', [skip('2026-10-04', '2026-10-10')])).toBeTruthy()
  })

  it('no recovery prompt for a skipped miss, and skips are not open pauses', () => {
    expect(recoveryOffer(daily, done(days('2026-10-10', 8)), [skip('2026-10-18')], [], TODAY)).toBeNull()
    expect(openPause(daily, [skip('2026-10-18')])).toBeUndefined()
  })
})
