import { describe, it, expect } from 'vitest'
import { computeStreak } from '../../src/domain/streak.js'
import { TODAY, makeTask, done, days, pause } from './helpers.js'

const streak = (task, completions, pauses = [], vacations = []) =>
  computeStreak(task, completions, pauses, vacations, TODAY)

describe('computeStreak: daily', () => {
  const daily = makeTask()

  it('counts consecutive met days including today', () => {
    expect(streak(daily, done(days('2026-10-15', 5)))).toBe(5)
  })

  it('an unfinished today does not wipe the streak', () => {
    expect(streak(daily, done(days('2026-10-15', 4)))).toBe(4)
  })

  it('stops at the first missed day', () => {
    expect(streak(daily, done([...days('2026-10-10', 4), ...days('2026-10-15', 4)]))).toBe(4)
  })

  it('missing yesterday means 0 even with older history', () => {
    expect(streak(daily, done(days('2026-10-01', 17)))).toBe(0) // last done Oct 17
  })

  it('2/day needs both completions', () => {
    const floss = makeTask({ target: 2 })
    const history = done(['2026-10-15', '2026-10-16', '2026-10-16', '2026-10-17', '2026-10-17', '2026-10-18', '2026-10-18', '2026-10-19'])
    expect(streak(floss, history)).toBe(3) // today has 1 of 2, Oct 15 has 1 of 2
  })

  it('returns null for chores', () => {
    expect(streak(makeTask({ kind: 'chore' }), done(days('2026-10-15', 5)))).toBeNull()
  })
})

describe('computeStreak: weekly and longer', () => {
  it('multiple completions on one day all count', () => {
    const stretch = makeTask({ period: 'week', target: 4 })
    const history = done([
      '2026-10-12', '2026-10-12', '2026-10-12', '2026-10-12', // week of Oct 11: all four on Monday
      '2026-10-04', '2026-10-06', '2026-10-08', '2026-10-10', // week of Oct 4
      '2026-09-28', '2026-09-30', '2026-10-02',               // week of Sep 27: only 3
    ])
    expect(streak(stretch, history)).toBe(2)
  })

  it('extra completions never roll into the next period', () => {
    const stretch = makeTask({ period: 'week', target: 4 })
    const history = done([...days('2026-10-11', 7), '2026-10-12', '2026-10-04', '2026-10-05', '2026-10-06'])
    expect(streak(stretch, history)).toBe(1) // 8 in week of Oct 11, only 3 in week of Oct 4
  })

  it('quantity tasks sum amounts', () => {
    const putting = makeTask({ period: 'week', target: 1000, unit_type: 'quantity' })
    const history = [
      ...done(Array(20).fill('2026-10-14'), { amount: 50 }), // 1000 in week of Oct 11
      ...done(Array(19).fill('2026-10-07'), { amount: 50 }), // 950 in week of Oct 4
    ]
    expect(streak(putting, history)).toBe(1)
  })

  it('biweek walks back in 14-day blocks', () => {
    const bi = makeTask({ period: 'biweek', period_anchor: '2026-01-04' })
    // Current Oct 11-24 not done; Sep 27-Oct 10 done; Sep 13-26 done; Aug 30-Sep 12 missed.
    expect(streak(bi, done(['2026-10-01', '2026-09-20']))).toBe(2)
  })

  it('monthly', () => {
    const month = makeTask({ period: 'month' })
    expect(streak(month, done(['2026-09-30', '2026-08-01', '2026-06-15']))).toBe(2)
  })

  it('yearly', () => {
    const year = makeTask({ period: 'year', target: 2, active_since: '2023-01-01' })
    expect(streak(year, done(['2025-03-01', '2025-09-01', '2024-05-05', '2024-06-06', '2023-01-01']))).toBe(2)
  })

  it('a current period that is already met counts', () => {
    const stretch = makeTask({ period: 'week', target: 2 })
    expect(streak(stretch, done(['2026-10-18', '2026-10-19', '2026-10-12', '2026-10-13']))).toBe(2)
  })
})

describe('computeStreak: pauses and vacations', () => {
  const daily = makeTask()

  it('paused days are skipped, not broken', () => {
    const history = done([...days('2026-10-10', 4), ...days('2026-10-17', 2)]) // gap Oct 14-16
    expect(streak(daily, history, [pause('2026-10-14', '2026-10-16')])).toBe(6)
  })

  it('completions during a pause do not extend the streak', () => {
    const history = done(days('2026-10-10', 9)) // Oct 10-18, every day
    expect(streak(daily, history, [pause('2026-10-14', '2026-10-16')])).toBe(6)
  })

  it('an ongoing pause freezes the streak', () => {
    const history = done(days('2026-10-10', 7)) // Oct 10-16
    expect(streak(daily, history, [pause('2026-10-17')])).toBe(7)
  })

  it('one paused day excludes the whole week', () => {
    const weekly = makeTask({ period: 'week' })
    const history = done(['2026-10-13', '2026-09-30']) // weeks of Oct 11 and Sep 27; nothing in week of Oct 4
    expect(streak(weekly, history, [pause('2026-10-07', '2026-10-07')])).toBe(2)
    expect(streak(weekly, history)).toBe(1)
  })

  it("only this task's pauses apply", () => {
    const history = done([...days('2026-10-10', 4), ...days('2026-10-17', 2)])
    expect(streak(daily, history, [{ ...pause('2026-10-14', '2026-10-16'), task_id: 'other' }])).toBe(2)
  })

  it('vacation pauses flagged tasks only', () => {
    const history = done([...days('2026-10-10', 4), ...days('2026-10-17', 2)])
    const vacation = [{ start_date: '2026-10-14', end_date: '2026-10-16' }]
    expect(streak(makeTask({ pauses_on_vacation: true }), history, [], vacation)).toBe(6)
    expect(streak(makeTask({ pauses_on_vacation: false }), history, [], vacation)).toBe(2)
  })
})

describe('computeStreak: active_since', () => {
  it('ignores completions before active_since', () => {
    const daily = makeTask({ active_since: '2026-10-12' })
    expect(streak(daily, done(days('2026-10-01', 18)))).toBe(7) // Oct 12-18
  })

  it('a task activated today has no streak yet', () => {
    expect(streak(makeTask({ active_since: TODAY }), done(days('2026-10-01', 18)))).toBe(0)
  })
})
