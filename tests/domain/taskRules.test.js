import { describe, it, expect } from 'vitest'
import { normalizeTask, validateTask, newTaskDefaults } from '../../src/domain/taskRules.js'

const base = (o = {}) => ({ ...newTaskDefaults('2026-10-19'), name: 'X', ...o })

describe('normalizeTask', () => {
  it('habits never keep grace days', () => {
    expect(normalizeTask(base({ kind: 'habit', period: 'week', pinned_day: 3, grace_days: 2 })).grace_days).toBe(0)
  })

  it('chores keep grace only when pinned', () => {
    expect(normalizeTask(base({ kind: 'chore', period: 'week', pinned_day: 3, grace_days: '2' })).grace_days).toBe(2)
    expect(normalizeTask(base({ kind: 'chore', period: 'week', pinned_day: null, grace_days: 2 })).grace_days).toBe(0)
  })

  it('drops pins on daily and monthly tasks', () => {
    expect(normalizeTask(base({ period: 'day', pinned_day: 3 })).pinned_day).toBeNull()
    expect(normalizeTask(base({ period: 'month', pinned_day: 3 })).pinned_day).toBeNull()
  })

  it('snaps the biweek anchor to its Sunday and clears it otherwise', () => {
    expect(normalizeTask(base({ period: 'biweek', period_anchor: '2026-10-21' })).period_anchor).toBe('2026-10-18')
    expect(normalizeTask(base({ period: 'week', period_anchor: '2026-10-21' })).period_anchor).toBeNull()
  })

  it('a plain count is an occurrence task', () => {
    expect(normalizeTask(base({ target: 2, quick_add: 1, unit_label: '  ' }))).toMatchObject({ unit_type: 'occurrence', unit_label: null })
  })

  it('a unit, a bigger + step or a fractional frequency makes it a quantity task', () => {
    expect(normalizeTask(base({ unit_label: 'pages' })).unit_type).toBe('quantity')
    expect(normalizeTask(base({ quick_add: 50 })).unit_type).toBe('quantity')
    expect(normalizeTask(base({ target: 2.5 })).unit_type).toBe('quantity')
  })

  it('converts form strings to numbers and trims the name', () => {
    const t = normalizeTask(base({ name: '  Putting ', target: '1000', quick_add: '50', unit_label: 'putts' }))
    expect(t).toMatchObject({ name: 'Putting', target: 1000, quick_add: 50, unit_type: 'quantity' })
  })
})

describe('validateTask', () => {
  const errors = (o) => validateTask(normalizeTask(base(o)))

  it('accepts a valid task', () => {
    expect(errors({})).toEqual({})
  })

  it('needs a name and a positive target', () => {
    expect(errors({ name: ' ' })).toHaveProperty('name')
    expect(errors({ target: 0 })).toHaveProperty('target')
  })

  it('the + step must be positive', () => {
    expect(errors({ quick_add: 0 })).toHaveProperty('quick_add')
  })

  it('grace is 0 to 6 days', () => {
    expect(errors({ kind: 'chore', period: 'week', pinned_day: 1, grace_days: 7 })).toHaveProperty('grace_days')
  })

  it('biweek needs an anchor', () => {
    expect(errors({ period: 'biweek', period_anchor: null })).toHaveProperty('period_anchor')
  })
})
