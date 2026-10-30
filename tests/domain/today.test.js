import { describe, it, expect } from 'vitest'
import { todayState } from '../../src/domain/status.js'
import { makeTask, done } from './helpers.js'

describe('todayState without a due date', () => {
  it('daily: open until met, then done for that day', () => {
    const floss = makeTask({ target: 2 })
    expect(todayState(floss, done(['2026-10-19']), '2026-10-19')).toBe('open')
    expect(todayState(floss, done(['2026-10-19', '2026-10-19']), '2026-10-19')).toBe('done')
    expect(todayState(floss, done(['2026-10-19', '2026-10-19']), '2026-10-20')).toBe('open')
  })

  it('counted weekly goal: open all week until met, done that day, then hidden for the rest of the week', () => {
    const stretch = makeTask({ period: 'week', target: 2 })
    const history = done(['2026-10-19', '2026-10-21'])
    expect(todayState(stretch, history, '2026-10-20')).toBe('open') // 1 of 2
    expect(todayState(stretch, history, '2026-10-21')).toBe('done')
    expect(todayState(stretch, history, '2026-10-23')).toBe('hidden')
    expect(todayState(stretch, history, '2026-10-25')).toBe('open') // new week
  })
})
