import { describe, it, expect } from 'vitest'
import { missedPeriods } from '../../src/domain/missed.js'

const base = {
  id: 't1', active: true, active_since: '2026-10-01', period: 'day', target: 1, kind: 'habit',
  pinned_day: null, due_day: null, due_week: null, due_month: null, grace_days: 0,
  season_start: null, season_end: null, pauses_on_vacation: false,
}
const done = (date, amount = 1) => ({ task_id: 't1', date, amount })

describe('missedPeriods', () => {
  it('lists past days a daily habit was not done, newest first, not today', () => {
    const task = { ...base, active_since: '2026-10-28' }
    const list = missedPeriods(task, [done('2026-10-29')], [], [], '2026-11-01')
    expect(list.map((m) => m.closes)).toEqual(['2026-10-31', '2026-10-30', '2026-10-28'])
  })

  it('shows a weekly chore once its due day (plus grace) has passed, before the week ends', () => {
    const chore = { ...base, kind: 'chore', period: 'week', pinned_day: 0 } // due Sunday
    expect(missedPeriods(chore, [], [], [], '2026-11-01')).toEqual([
      expect.objectContaining({ closes: '2026-10-25', fillDate: '2026-10-25' }),
      expect.objectContaining({ closes: '2026-10-18' }),
    ])
    const list = missedPeriods(chore, [], [], [], '2026-11-02')
    expect(list[0]).toMatchObject({ closes: '2026-11-01', fillDate: '2026-11-01', missing: 1 })
    const graced = { ...chore, grace_days: 2 }
    expect(missedPeriods(graced, [], [], [], '2026-11-02')[0].closes).toBe('2026-10-27')
  })

  it('leaves out met, skipped and dismissed periods, and anything past the lookback', () => {
    const task = { ...base, active_since: '2026-01-01', dismissed_misses: ['2026-10-30'] }
    const skip = { task_id: 't1', start_date: '2026-10-29', end_date: '2026-10-29', is_skip: true }
    const list = missedPeriods(task, [done('2026-10-31')], [skip], [], '2026-11-01')
    expect(list.map((m) => m.closes)).not.toContain('2026-10-31')
    expect(list.map((m) => m.closes)).not.toContain('2026-10-30')
    expect(list.map((m) => m.closes)).not.toContain('2026-10-29')
    expect(list.at(-1).closes).toBe('2026-10-18')
  })

  it('counts what is still missing for a counted goal', () => {
    const task = { ...base, period: 'week', target: 4 }
    const list = missedPeriods(task, [done('2026-10-26'), done('2026-10-27')], [], [], '2026-11-01')
    expect(list[0]).toMatchObject({ closes: '2026-10-31', fillDate: '2026-10-31', missing: 2 })
  })
})
