import { reactive } from 'vue'
import { addDays } from '../domain/dates.js'
import { wasLate } from '../domain/status.js'
import { openPause } from '../domain/pauses.js'

// Shared app state. Views read from here; changes go through the repo first.
export const state = reactive({
  ready: false,
  demo: false,
  error: '', // last failed load or save, shown as a banner
  email: '', // signed-in account, for Settings
  tasks: [],
  completions: [], // kept in creation order, oldest first
  pauses: [],
  vacations: [],
})

let repo

export async function initStore(newRepo) {
  repo = newRepo
  Object.assign(state, await repo.load(), { ready: true, demo: repo.mode === 'demo' })
}

const removeFrom = (list, row) => list.splice(list.indexOf(row), 1)

// ---- Completions ----

export async function addCompletion(task, date, amount = task.quick_add) {
  const saved = await repo.insert('completions', {
    task_id: task.id,
    date,
    amount: Number(amount),
    was_late: wasLate(task, date),
    note: null,
  })
  state.completions.push(saved)
}

// "−" undoes the most recent completion for this task on this day.
export async function removeLastCompletion(task, date) {
  const last = state.completions.findLast((c) => c.task_id === task.id && c.date === date)
  if (!last) return
  await repo.remove('completions', last.id)
  removeFrom(state.completions, last)
}

// ---- Tasks ----

export async function createTask(fields) {
  const sort_order = Math.max(0, ...state.tasks.map((t) => t.sort_order)) + 1
  state.tasks.push(await repo.insert('tasks', { ...fields, sort_order }))
}

export async function updateTask(task, fields) {
  Object.assign(task, await repo.update('tasks', task.id, fields))
}

export async function deleteTask(task) {
  await repo.remove('tasks', task.id)
  removeFrom(state.tasks, task)
  state.completions = state.completions.filter((c) => c.task_id !== task.id)
  state.pauses = state.pauses.filter((p) => p.task_id !== task.id)
}

// Turning a task back on starts it fresh: earlier completions stop counting.
export async function setActive(task, active, today) {
  await updateTask(task, active ? { active: true, active_since: today } : { active: false })
}

// ---- Pauses ----

export async function pauseTask(task, today) {
  state.pauses.push(await repo.insert('pauses', { task_id: task.id, start_date: today, end_date: null }))
}

// Resuming makes today count again. A pause started and ended the same day is just removed.
export async function resumeTask(task, today) {
  const open = openPause(task, state.pauses)
  if (!open) return
  if (open.start_date >= today) {
    await repo.remove('pauses', open.id)
    removeFrom(state.pauses, open)
  } else {
    Object.assign(open, await repo.update('pauses', open.id, { end_date: addDays(today, -1) }))
  }
}

// ---- Vacations ----

export async function saveVacation(vacation, fields) {
  if (vacation) Object.assign(vacation, await repo.update('vacations', vacation.id, fields))
  else state.vacations.push(await repo.insert('vacations', fields))
}

// Ending makes today normal again. One that hasn't started yet is cancelled.
export async function endVacation(vacation, today) {
  if (vacation.start_date >= today) {
    await repo.remove('vacations', vacation.id)
    removeFrom(state.vacations, vacation)
  } else {
    Object.assign(vacation, await repo.update('vacations', vacation.id, { end_date: addDays(today, -1) }))
  }
}
