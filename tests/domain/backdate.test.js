import { describe, it, expect } from 'vitest'
import { backdatePlan, computeStreak } from '../../src/domain/streak.js'
import { TODAY, makeTask, done, pause } from './helpers.js'

const plan = (task, completions = [], pauses = [], n) => backdatePlan(task, completions, pauses, [], TODAY, n)
const asCompletions = (rows) => rows.map((r) => ({ task_id: 't1', ...r }))

describe('backdatePlan', () => {
  it('fills the N days before today and moves the start back', () => {
    const duolingo = makeTask({ active_since: TODAY })
    const { rows, activeSince } = plan(duolingo, [], [], 312)
    expect(rows).toHaveLength(312)
    expect(rows[0]).toEqual({ date: '2026-10-18', amount: 1 })
    expect(activeSince).toBe('2025-12-11')
    const t = { ...duolingo, active_since: activeSince }
    expect(computeStreak(t, asCompletions(rows), [], [], TODAY)).toBe(312)
    expect(computeStreak(t, [...asCompletions(rows), ...done([TODAY])], [], [], TODAY)).toBe(313)
  })

  it('2/day habits get two entries per day; already-logged days are only topped up', () => {
    const floss = makeTask({ target: 2, active_since: TODAY })
    const { rows } = plan(floss, done(['2026-10-18']), [], 2)
    expect(rows).toEqual([
      { date: '2026-10-18', amount: 1 },
      { date: '2026-10-17', amount: 1 },
      { date: '2026-10-17', amount: 1 },
    ])
  })

  it('weekly quantity habits get one entry per week for the full amount', () => {
    const putting = makeTask({ period: 'week', target: 1000, unit_type: 'quantity', active_since: TODAY })
    const { rows, activeSince } = plan(putting, [], [], 3)
    expect(rows).toEqual([
      { date: '2026-10-17', amount: 1000 },
      { date: '2026-10-10', amount: 1000 },
      { date: '2026-10-03', amount: 1000 },
    ])
    expect(activeSince).toBe('2026-09-27')
  })

  it('skips paused and off-season periods without counting them', () => {
    const daily = makeTask({ active_since: TODAY })
    const { rows } = plan(daily, [], [pause('2026-10-16', '2026-10-17')], 3)
    expect(rows.map((r) => r.date)).toEqual(['2026-10-18', '2026-10-15', '2026-10-14'])
    const summer = makeTask({ period: 'month', season_start: '2000-05-01', season_end: '2000-09-30', active_since: TODAY })
    expect(plan(summer, [], [], 2).rows.map((r) => r.date)).toEqual(['2026-09-30', '2026-08-31'])
  })

  it('never moves the start date later', () => {
    expect(plan(makeTask({ active_since: '2020-01-01' }), [], [], 2).activeSince).toBe('2020-01-01')
  })
})
