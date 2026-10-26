import { describe, it, expect } from 'vitest'
import { recoveryOffer, computeStreak } from '../../src/domain/streak.js'
import { TODAY, makeTask, done, days, pause } from './helpers.js'

const offer = (task, completions, pauses = []) => recoveryOffer(task, completions, pauses, [], TODAY)

describe('recoveryOffer', () => {
  const floss = makeTask({ target: 2 })
  const twice = (dates) => done(dates.flatMap((d) => [d, d]))

  it('offers to fill a single missed day after a streak', () => {
    // Oct 10–17 done, Oct 18 (yesterday) only once, today logged once.
    const history = [...twice(days('2026-10-10', 8)), ...done(['2026-10-18', TODAY])]
    expect(offer(floss, history)).toEqual({
      period: { start: '2026-10-18', end: '2026-10-18' },
      streak: 8,
      missing: 1,
      fillDate: '2026-10-18',
    })
  })

  it('filling it in restores the streak', () => {
    const history = [...twice(days('2026-10-10', 8)), ...twice(['2026-10-18', TODAY])]
    expect(offer(floss, history)).toBeNull()
    expect(computeStreak(floss, history, [], [], TODAY)).toBe(10)
  })

  it('nothing to offer when yesterday was met, or two days were missed', () => {
    expect(offer(floss, twice(days('2026-10-10', 9)))).toBeNull()
    expect(offer(floss, twice(days('2026-10-10', 7)))).toBeNull() // Oct 17 and 18 both missed
  })

  it('nothing to offer without a streak before the miss', () => {
    expect(offer(floss, done([TODAY]))).toBeNull()
  })

  it("doesn't ask again about a declined miss", () => {
    const history = twice(days('2026-10-10', 8))
    expect(offer({ ...floss, recovery_declined_on: '2026-10-18' }, history)).toBeNull()
    expect(offer({ ...floss, recovery_declined_on: '2026-10-01' }, history)).not.toBeNull()
  })

  it('skips paused periods when looking for the miss', () => {
    const history = twice(days('2026-10-10', 6)) // Oct 10–15; Oct 16 missed; 17–18 paused
    expect(offer(floss, history, [pause('2026-10-17', '2026-10-18')])?.period.start).toBe('2026-10-16')
  })

  it('weekly: fills the missed week on its last day', () => {
    const stretch = makeTask({ period: 'week', target: 4 })
    const history = done([...days('2026-09-27', 4), ...days('2026-10-04', 4), '2026-10-12', '2026-10-13'])
    expect(offer(stretch, history)).toMatchObject({ streak: 2, missing: 2, fillDate: '2026-10-17' })
  })

  it('weekly with a due day: fills on the due day so it is not late', () => {
    const t = makeTask({ period: 'week', pinned_day: 3 })
    expect(offer(t, done(['2026-09-30', '2026-10-07']))?.fillDate).toBe('2026-10-14')
  })

  it('never for chores', () => {
    expect(offer(makeTask({ kind: 'chore' }), done(days('2026-10-10', 8)))).toBeNull()
  })
})
