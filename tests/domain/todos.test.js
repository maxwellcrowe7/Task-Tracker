import { describe, it, expect } from 'vitest'
import { todoState, dueLabel, sortTodos, stepProgress, nextStepDue, allStepsDone, showsFrom } from '../../src/domain/todos.js'

const TODAY = '2026-10-27' // Tuesday
const todo = (o = {}) => ({ id: 'x', title: 'X', due_date: null, done_on: null, lead_days: null, show_from: null, sort_order: 0, created_at: '2026-10-01T00:00:00Z', ...o })

describe('todoState', () => {
  it('undated and overdue to-dos are on today', () => {
    expect(todoState(todo(), TODAY, TODAY)).toBe('open')
    expect(todoState(todo({ due_date: '2026-10-02' }), TODAY, TODAY)).toBe('open')
  })

  it('dated to-dos show right away unless set to wait', () => {
    expect(todoState(todo({ due_date: '2026-12-25' }), TODAY, TODAY)).toBe('open')
  })

  it('can wait until some days before the due date', () => {
    expect(todoState(todo({ due_date: '2026-10-29', lead_days: 2 }), TODAY, TODAY)).toBe('open')
    expect(todoState(todo({ due_date: '2026-10-30', lead_days: 2 }), TODAY, TODAY)).toBe('hidden')
    expect(todoState(todo({ lead_days: 2 }), TODAY, TODAY)).toBe('open') // no due date: nothing to count from
  })

  it('can wait until a set date, with or without a due date', () => {
    expect(todoState(todo({ show_from: '2026-11-01' }), TODAY, TODAY)).toBe('hidden')
    expect(todoState(todo({ show_from: TODAY, due_date: '2026-12-01' }), TODAY, TODAY)).toBe('open')
    expect(showsFrom(todo({ show_from: '2026-11-01', lead_days: 2, due_date: '2026-11-20' }))).toBe('2026-11-01') // the date wins
  })

  it('done shows under Completed only on the day it was done', () => {
    expect(todoState(todo({ done_on: TODAY }), TODAY, TODAY)).toBe('done')
    expect(todoState(todo({ done_on: '2026-10-26' }), TODAY, TODAY)).toBe('hidden')
    expect(todoState(todo({ done_on: '2026-10-26' }), '2026-10-26', TODAY)).toBe('done')
  })

  it('open to-dos are not shown on past days', () => {
    expect(todoState(todo(), '2026-10-26', TODAY)).toBe('hidden')
  })
})

describe('dueLabel', () => {
  it('reads naturally', () => {
    expect(dueLabel(todo({ due_date: '2026-10-02' }), TODAY)).toEqual({ text: 'Overdue · Oct 2', tone: 'late' })
    expect(dueLabel(todo({ due_date: TODAY }), TODAY)).toEqual({ text: 'Today', tone: 'late' })
    expect(dueLabel(todo({ due_date: '2026-10-28' }), TODAY)).toEqual({ text: 'Tomorrow', tone: 'due' })
    expect(dueLabel(todo({ due_date: '2026-10-30' }), TODAY).text).toBe('Fri')
    expect(dueLabel(todo({ due_date: '2026-11-12' }), TODAY).text).toBe('Nov 12')
    expect(dueLabel(todo(), TODAY)).toBeNull()
  })
})

describe('sortTodos', () => {
  it('dated soonest first, then undated in the order added', () => {
    const list = [
      todo({ id: 'a', created_at: '2026-10-03' }),
      todo({ id: 'b', due_date: '2026-11-01' }),
      todo({ id: 'c', created_at: '2026-10-01' }),
      todo({ id: 'd', due_date: '2026-10-20' }),
    ]
    expect(sortTodos(list).map((t) => t.id)).toEqual(['d', 'b', 'c', 'a'])
  })

  it('flagged first within the same due date, and among the undated', () => {
    const list = [
      todo({ id: 'a', due_date: '2026-10-30', created_at: '2026-10-01' }),
      todo({ id: 'b', due_date: '2026-10-30', priority: 'high', created_at: '2026-10-02' }),
      todo({ id: 'c', due_date: '2026-10-29', created_at: '2026-10-03' }),
      todo({ id: 'd', created_at: '2026-10-04' }),
      todo({ id: 'e', priority: 'high', created_at: '2026-10-05' }),
    ]
    expect(sortTodos(list).map((t) => t.id)).toEqual(['c', 'b', 'a', 'e', 'd'])
  })
})

describe('stepProgress', () => {
  it('counts finished steps, or nothing when there are none', () => {
    expect(stepProgress(todo())).toBe(null)
    expect(stepProgress(todo({ steps: [] }))).toBe(null)
    expect(stepProgress(todo({ steps: [{ done: true }, { done: false }, { done: true }] }))).toEqual({ done: 2, total: 3 })
  })
})

describe('step due dates', () => {
  const steps = [
    { id: 'a', text: 'A', done: true, due_date: '2026-10-20' },
    { id: 'b', text: 'B', done: false, due_date: '2026-10-30' },
    { id: 'c', text: 'C', done: false, due_date: '2026-10-28' },
    { id: 'd', text: 'D', done: false },
  ]

  it('finds the soonest unfinished step date', () => {
    expect(nextStepDue(todo({ steps }))).toBe('2026-10-28')
    expect(nextStepDue(todo({ steps: [steps[0], steps[3]] }))).toBe(null)
  })

  it('a step due sooner brings a waiting to-do in on that day', () => {
    const waiting = todo({ show_from: '2026-11-15', steps })
    expect(showsFrom(waiting)).toBe('2026-10-28') // step C
    expect(todoState(todo({ show_from: '2026-11-15' }), TODAY, TODAY)).toBe('hidden')
    expect(showsFrom(todo({ steps }))).toBe(null) // already showing
  })

  it('knows when every step is checked', () => {
    expect(allStepsDone(todo({ steps: [{ done: true }, { done: true }] }))).toBe(true)
    expect(allStepsDone(todo({ steps: [{ done: true }, { done: false }] }))).toBe(false)
    expect(allStepsDone(todo())).toBe(false)
  })
})
