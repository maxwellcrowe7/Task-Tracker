import { state, skipPeriod, undoSkip, deleteTodo, restoreTodo } from '../data/store.js'
import { skipOn, isPausedOn } from '../domain/pauses.js'
import { todayState } from '../domain/status.js'
import { showToast } from './toast.js'

// The one-tap actions shared by swipe (phones), the hover button and keys (desktop):
// skip a habit or chore for its period, or delete a to-do. Both offer Undo.

// 'skip', 'unskip', or null when there's nothing to skip (done or paused that day).
export function skipActionFor(task, date) {
  if (skipOn(task, date, state.pauses)) return 'unskip'
  if (isPausedOn(task, date, state.pauses, state.vacations)) return null
  return todayState(task, state.completions, date) === 'open' ? 'skip' : null
}

export async function toggleSkip(task, date, today) {
  const action = skipActionFor(task, date)
  if (action === 'unskip') return undoSkip(task, date)
  if (action === 'skip') return skipWithUndo(task, date, today)
}

// Skip the period around `date`, with an Undo toast.
export async function skipWithUndo(task, date, today) {
  await skipPeriod(task, date)
  const when =
    task.period === 'day'
      ? date === today ? 'today' : 'that day'
      : `this ${{ week: 'week', biweek: '2 weeks', month: 'month', year: 'year' }[task.period]}`
  showToast(`Skipped ${task.name} ${when}`, () => undoSkip(task, date))
}

export async function deleteTodoWithUndo(todo) {
  const row = JSON.parse(JSON.stringify(todo))
  await deleteTodo(todo)
  showToast(`Deleted ${row.title}`, () => restoreTodo(row))
}

// Delete / Backspace or S on a selected row, unless you're typing somewhere.
export function isTyping() {
  const el = document.activeElement
  return Boolean(el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable))
}
export const isDeleteKey = (e) => (e.key === 'Delete' || e.key === 'Backspace') && !e.metaKey && !e.ctrlKey && !e.altKey
export const isSkipKey = (e) => e.key.toLowerCase() === 's' && !e.metaKey && !e.ctrlKey && !e.altKey
