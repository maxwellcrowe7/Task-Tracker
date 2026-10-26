import { addDays, dayOfWeek } from './dates.js'
import { hasDue } from './due.js'

// Fields the task form edits. Subtag and sort order aren't in the UI yet.
export const EDITABLE_FIELDS = [
  'name', 'kind', 'scope', 'period', 'period_anchor', 'target', 'unit_label',
  'quick_add', 'pinned_day', 'due_day', 'due_week', 'due_month', 'grace_days', 'active',
  'active_since', 'pauses_on_vacation', 'season_start', 'season_end', 'notes',
]

export const pinAllowed = (period) => period === 'week' || period === 'biweek'

export const sundayOf = (date) => addDays(date, -dayOfWeek(date))

export const newTaskDefaults = (today) => ({
  name: '',
  kind: 'habit',
  scope: 'personal',
  period: 'day',
  period_anchor: null,
  target: 1,
  unit_label: '',
  quick_add: 1,
  pinned_day: null,
  due_day: null,
  due_week: null,
  due_month: null,
  grace_days: 0,
  active: true,
  active_since: today,
  pauses_on_vacation: false,
  season_start: null,
  season_end: null,
  notes: '',
})

// Turns form input into a clean row, applying the same rules the database enforces:
// habits never have grace, due rules must match the period (see due.js), grace only
// with a due rule, biweek anchors snap to a Sunday. unit_type isn't asked for: a plain count (no unit,
// + adds 1, whole-number frequency) is 'occurrence', anything else is 'quantity'.
export function normalizeTask(input) {
  const t = { ...input }
  t.name = String(t.name ?? '').trim()
  t.notes = String(t.notes ?? '').trim() || null
  t.target = Number(t.target)
  t.quick_add = Number(t.quick_add)
  t.grace_days = Number(t.grace_days) || 0

  t.unit_label = String(t.unit_label ?? '').trim() || null
  const plainCount = !t.unit_label && t.quick_add === 1 && Number.isInteger(t.target)
  t.unit_type = plainCount ? 'occurrence' : 'quantity'

  if (t.period !== 'biweek') t.period_anchor = null
  else if (t.period_anchor) t.period_anchor = sundayOf(t.period_anchor)

  const num = (v) => (v === '' || v == null ? null : Number(v))
  t.pinned_day = num(t.pinned_day)
  t.due_day = num(t.due_day)
  t.due_week = num(t.due_week)
  t.due_month = num(t.due_month)
  if (t.period === 'day') {
    t.pinned_day = t.due_day = t.due_week = t.due_month = null
  } else if (pinAllowed(t.period)) {
    t.due_day = t.due_week = t.due_month = null
  } else {
    // Month / year: either a day number or an Nth weekday (which uses pinned_day).
    if (t.due_week != null) t.due_day = null
    else t.pinned_day = null
    if (t.period === 'month' || (t.due_day == null && t.due_week == null)) t.due_month = null
  }

  if (t.kind === 'habit' || !hasDue(t)) t.grace_days = 0

  // A season needs both ends; otherwise the task is year-round.
  if (!t.season_start || !t.season_end) {
    t.season_start = null
    t.season_end = null
  }
  return t
}

// Returns { field: message } for anything wrong; empty object when valid.
export function validateTask(t) {
  const errors = {}
  if (!t.name) errors.name = 'Give it a name.'
  if (!(t.target > 0)) errors.target = 'Must be more than 0.'
  if (!(t.quick_add > 0)) errors.quick_add = 'Must be more than 0.'
  if (!Number.isInteger(t.grace_days) || t.grace_days < 0 || t.grace_days > 6) errors.grace_days = 'Between 0 and 6 days.'
  if (t.period === 'biweek' && !t.period_anchor) errors.period_anchor = 'Pick a starting week.'
  if (t.due_week != null && t.pinned_day == null) errors.due = 'Pick a weekday.'
  if (t.period === 'year' && (t.due_day != null || t.due_week != null) && t.due_month == null) errors.due = 'Pick a month.'
  if (!t.active_since) errors.active_since = 'Pick a date.'
  return errors
}
