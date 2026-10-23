import { addDays } from '../../src/domain/dates.js'

// Monday. Its week is Sun 2026-10-18 .. Sat 2026-10-24.
export const TODAY = '2026-10-19'

export const makeTask = (overrides = {}) => ({
  id: 't1',
  name: 'Test',
  kind: 'habit',
  period: 'day',
  period_anchor: null,
  target: 1,
  unit_type: 'occurrence',
  pinned_day: null,
  grace_days: 0,
  active_since: '2026-01-01',
  pauses_on_vacation: false,
  ...overrides,
})

// One completion (amount 1 unless given) per date listed; repeat a date to log it twice.
export const done = (dates, extra = {}) => dates.map((date) => ({ task_id: 't1', date, amount: 1, ...extra }))

// n consecutive dates starting at `start`.
export const days = (start, n) => Array.from({ length: n }, (_, i) => addDays(start, i))

export const pause = (start_date, end_date = null) => ({ task_id: 't1', start_date, end_date })
