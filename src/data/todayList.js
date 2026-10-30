import { state } from './store.js'
import { inSeason } from '../domain/season.js'
import { todayState } from '../domain/status.js'
import { todoState, sortTodos } from '../domain/todos.js'
import { skipOn } from '../domain/pauses.js'

// Routines in their set order, with anything skipped on `date` sunk to the bottom.
export const routineOrder = (date) => (a, b) =>
  Boolean(skipOn(a, date, state.pauses)) - Boolean(skipOn(b, date, state.pauses)) || a.sort_order - b.sort_order

// The Today list for one side (personal / work) on `date`, split into what's still
// open and what was finished that day (shown under Completed).
export function todayLists(date, scope, today = date) {
  const open = []
  const done = []
  const tasks = state.tasks
    .filter((t) => t.active && t.scope === scope && t.active_since <= date && inSeason(t, date))
    .sort(routineOrder(date))
  for (const task of tasks) {
    const where = todayState(task, state.completions, date)
    if (where === 'open') open.push(task)
    else if (where === 'done') done.push(task)
  }

  const todos = sortTodos(state.todos.filter((t) => t.scope === scope))
  const openTodos = todos.filter((t) => todoState(t, date, today) === 'open')
  const doneTodos = todos.filter((t) => todoState(t, date, today) === 'done')
  return { open, done, openTodos, doneTodos }
}
