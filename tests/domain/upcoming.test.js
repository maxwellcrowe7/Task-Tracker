import { describe, it, expect } from 'vitest'
import { upcomingItems } from '../../src/domain/upcoming.js'
import { TODAY, makeTask, done } from './helpers.js'

const ids = (items) => items.map((i) => `${i.task.id}@${i.date}`)

describe('upcomingItems', () => {
  // TODAY is Mon Oct 19, 2026.
  const vacuum = makeTask({ id: 'vac', kind: 'chore', period: 'week', pinned_day: 3 }) // Wednesdays
  const budget = makeTask({ id: 'bud', kind: 'chore', period: 'month', due_day: -1 }) // last day
  const floss = makeTask({ id: 'floss' }) // no due date

  it('lists due dates in the window, soonest first, never undated tasks', () => {
    expect(ids(upcomingItems([budget, vacuum, floss], [], TODAY, 14))).toEqual(['vac@2026-10-21', 'vac@2026-10-28', 'bud@2026-10-31'])
  })

  it('skips periods already met', () => {
    const history = done(['2026-10-19']).map((c) => ({ ...c, task_id: 'vac' }))
    expect(ids(upcomingItems([vacuum], history, TODAY, 14))).toEqual(['vac@2026-10-28'])
  })

  it('starts tomorrow and respects inactive tasks and seasons', () => {
    expect(ids(upcomingItems([{ ...vacuum, active: false }], [], TODAY, 14))).toEqual([])
    const summer = { ...vacuum, season_start: '2000-05-01', season_end: '2000-09-30' }
    expect(ids(upcomingItems([summer], [], TODAY, 14))).toEqual([])
  })
})
