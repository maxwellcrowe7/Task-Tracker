import { addDays, dayOfWeek, diffDays } from '../domain/dates.js'
import { wasLate } from '../domain/status.js'

// Sample tasks plus about 8 weeks of history, built relative to `today` so the
// demo always looks current. Designed to show:
//   Duolingo: long streak     Floss: recently broken     Brush teeth: medium streak
//   Stretch / Putting: weekly streaks, with multiple completions on one day
//   Chores: a mix of on-time, late-but-in-grace and missed weeks
//   One past vacation (vacuum and bathroom pause, others don't); Wash car paused now
export function buildSampleData(today) {
  const weekStart = addDays(today, -dayOfWeek(today))
  const weeksBack = (n) => addDays(weekStart, -7 * n) // Sunday n weeks ago
  const historyStart = weeksBack(8)

  const base = {
    user_id: 'demo',
    kind: 'habit',
    period: 'day',
    period_anchor: null,
    target: 1,
    unit_type: 'occurrence',
    unit_label: null,
    quick_add: 1,
    pinned_day: null,
    grace_days: 0,
    active: true,
    active_since: historyStart,
    pauses_on_vacation: false,
    scope: 'personal',
    subtag: null,
    season_start: null,
    season_end: null,
    created_at: `${historyStart}T12:00:00Z`,
  }
  const chore = { kind: 'chore', period: 'week', pauses_on_vacation: true }

  const tasks = [
    { ...base, id: 'floss', name: 'Floss', target: 2 },
    { ...base, id: 'brush', name: 'Brush teeth', target: 2 },
    { ...base, id: 'duolingo', name: 'Duolingo', active_since: addDays(today, -120) },
    { ...base, id: 'stretch', name: 'Stretch', period: 'week', target: 4 },
    { ...base, id: 'putting', name: 'Putting', period: 'week', target: 1000, unit_type: 'quantity', unit_label: 'putts', quick_add: 50 },
    { ...base, ...chore, id: 'bathroom', name: 'Bathroom', pinned_day: 1, grace_days: 2 },
    { ...base, ...chore, id: 'garbage', name: 'Garbage', pinned_day: 2, pauses_on_vacation: false },
    { ...base, ...chore, id: 'vacuum', name: 'Vacuum', pinned_day: 3, grace_days: 2 },
    { ...base, ...chore, id: 'siop', name: 'Send SIOP recap', pinned_day: 3, grace_days: 1, scope: 'work', pauses_on_vacation: false },
    { ...base, ...chore, id: 'washcar', name: 'Wash car', period: 'month', pauses_on_vacation: false, active_since: addDays(today, -120) },
    { ...base, ...chore, id: 'mealplan', name: 'Meal plan', active: false, pauses_on_vacation: false },
  ].map((t, i) => ({ ...t, sort_order: i + 1 }))

  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]))
  const completions = []
  const log = (taskId, date, amount = 1) => {
    if (date > today) return
    completions.push({
      id: `seed-${completions.length + 1}`,
      task_id: taskId,
      user_id: 'demo',
      date,
      amount,
      was_late: wasLate(byId[taskId], date),
      note: null,
      created_at: `${date}T12:00:00Z`,
    })
  }
  const logTimes = (taskId, date, times) => {
    for (let i = 0; i < times; i++) log(taskId, date)
  }

  // Daily habits. `back` = days before today.
  for (let back = 120; back >= 0; back--) log('duolingo', addDays(today, -back))
  for (let d = historyStart; d <= today; d = addDays(d, 1)) {
    const back = diffDays(today, d)
    logTimes('brush', d, back === 0 || back === 23 ? 1 : 2)
    logTimes('floss', d, back === 0 ? 0 : [3, 15, 31].includes(back) ? 1 : 2)
  }

  // Stretch, 4/week. Offsets are days after Sunday; repeats = twice that day.
  const stretchWeeks = [
    [1, 3, 3, 5], [1, 2, 4, 6], [0, 1, 3, 5, 6], [1, 3, 3, 5], [2, 4, 5, 6],
    [1, 3, 5], // 6 weeks back: only 3, so the streak is 5
    [0, 2, 4, 6], [1, 1, 3, 5],
  ]
  stretchWeeks.forEach((offsets, i) => offsets.forEach((o) => log('stretch', addDays(weeksBack(i + 1), o))))
  log('stretch', weekStart)

  // Putting, 1000/week, logged as a few sessions per week.
  const puttingWeeks = [1100, 1000, 1250, 850, 1050, 1000, 900, 1200] // 4 weeks back misses
  puttingWeeks.forEach((total, i) => {
    const session = Math.round(total / 4 / 50) * 50
    ;[1, 2, 4].forEach((o) => log('putting', addDays(weeksBack(i + 1), o), session))
    log('putting', addDays(weeksBack(i + 1), 6), total - 3 * session)
  })
  log('putting', weekStart, 300)

  // Weekly chores: days after the pinned day, per week back (null = missed).
  // Index 2 is the vacation week.
  const choreWeeks = {
    bathroom: [0, 2, null, 0, 1, 0, null, 0],
    garbage: [0, 0, 0, 0, 0, null, 0, 0],
    vacuum: [1, 0, null, 2, null, 0, 1, 0],
    siop: [0, 1, 0, 0, 0, 1, 0, 0],
  }
  for (const [id, offsets] of Object.entries(choreWeeks)) {
    const pin = byId[id].pinned_day
    offsets.forEach((o, i) => o != null && log(id, addDays(weeksBack(i + 1), pin + o)))
    // This week: done on the pinned day if it has passed, except garbage (shows Overdue).
    const due = addDays(weekStart, pin)
    if (due < today && id !== 'garbage') log(id, due)
  }

  log('washcar', addDays(today, -45))
  log('washcar', addDays(today, -80))

  const pauses = [{ id: 'p1', task_id: 'washcar', user_id: 'demo', start_date: addDays(today, -10), end_date: null }]
  const vacations = [{ id: 'v1', user_id: 'demo', start_date: addDays(weeksBack(3), 4), end_date: addDays(weeksBack(3), 6) }]

  // One-off to-dos, a few per side.
  const todo = (id, scope, title, extra = {}) => ({
    id, user_id: 'demo', scope, title, notes: null, due_date: null, lead_days: null, show_from: null, priority: null, done_on: null,
    sort_order: 0, created_at: `${addDays(today, -5)}T12:00:00Z`, ...extra,
  })
  const tag = (id, name, color, scope, fav = false, parent_id = null) => ({ id, user_id: 'demo', name, color, scope, fav, parent_id, sort_order: 0 })
  const tags = [
    tag('g-errands', 'errands', 'forest', 'personal', true),
    tag('g-travel', 'travel', 'plum', 'personal', true),
    tag('g-house', 'house', 'amber', 'personal', true),
    tag('g-sports', 'sports', 'sky', 'personal'),
    tag('g-disc', 'disc golf', 'slate', 'personal', true, 'g-sports'),
    tag('g-football', 'football', 'orange', 'personal', false, 'g-sports'),
    tag('g-wrestling', 'wrestling', 'red', 'personal', false, 'g-sports'),
    tag('g-siop', 'SIOP', 'teal', 'work', true),
    tag('g-vendors', 'vendors', 'terracotta', 'work'),
    tag('g-urgent', 'urgent', 'rose', 'both'),
  ].map((t, i) => ({ ...t, sort_order: i + 1 }))

  const todos = [
    todo('t-library', 'personal', 'Return library books', { due_date: today, tag_ids: ['g-errands'] }),
    todo('t-dentist', 'personal', 'Call dentist about cleaning', { priority: 'high' }),
    todo('t-trip', 'personal', 'Plan Michigan trip', {
      notes: 'Look at cabins near Traverse City.',
      tag_ids: ['g-travel'],
      steps: [
        { id: 's-1', text: 'Pick dates', done: true },
        { id: 's-2', text: 'Book a cabin', done: false, due_date: addDays(today, 2) },
        { id: 's-3', text: 'Ask about dog-friendly beaches', done: false },
        { id: 's-4', text: 'Plan the drive', done: false },
      ],
    }),
    todo('t-putter', 'personal', 'Look into a new putter', { due_date: addDays(today, 9), tag_ids: ['g-disc'] }),
    todo('t-bag', 'personal', 'Order new disc bag', { done_on: today, tag_ids: ['g-disc'] }),
    todo('t-snow', 'personal', 'Put on winter tires', { show_from: addDays(today, 10) }),
    todo('t-fantasy', 'personal', 'Set fantasy football lineup', { due_date: addDays(today, 3), tag_ids: ['g-football'] }),
    todo('t-singlet', 'personal', 'Find wrestling tournament schedule', { tag_ids: ['g-wrestling'] }),
    todo('t-gross', 'work', 'Gross requirements report', { due_date: addDays(today, -3), tag_ids: ['g-siop', 'g-urgent'] }),
    todo('t-minmax', 'work', 'Update Min/Max file', { priority: 'high', tag_ids: ['g-siop'] }),
    todo('t-vendor', 'work', 'Vendor follow-ups', { due_date: addDays(today, 2), tag_ids: ['g-vendors'] }),
  ].map((t, i) => ({ tag_ids: [], steps: [], ...t, sort_order: i + 1 }))

  return { tasks, completions, pauses, vacations, todos, tags }
}
