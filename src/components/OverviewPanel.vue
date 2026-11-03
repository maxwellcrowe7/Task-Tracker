<script setup>
import { ref, computed, watch } from 'vue'
import { state } from '../data/store.js'
import { addDays, dayOfWeek, diffDays, minDate, WEEKDAY_SHORT } from '../domain/dates.js'
import { periodFor } from '../domain/periods.js'
import { dueDate, hasDue, dueBeforeStart } from '../domain/due.js'
import { graceEnd } from '../domain/status.js'
import { dailyTotals, sumRange, workingPeriod } from '../domain/totals.js'
import { isPausedOn, isPeriodPaused, pauseRangesFor } from '../domain/pauses.js'
import { inSeason, periodInSeason } from '../domain/season.js'
import { upcomingItems } from '../domain/upcoming.js'
import { formatShortDate } from '../lib/format.js'
import { context } from '../lib/context.js'
import Icon from './Icon.vue'

// The right-hand panel on wide screens when no task is open: this week's history for
// every routine at a glance, and what's coming up.
const props = defineProps({
  date: { type: String, required: true },
  today: { type: String, required: true },
})
const emit = defineEmits(['select', 'select-todo'])

// The arrows step through other weeks; picking a new day on Today comes back to its week.
const shift = ref(0) // weeks from the selected day's week
watch(() => props.date, () => (shift.value = 0))
const shown = computed(() => addDays(props.date, 7 * shift.value))
const weekStart = computed(() => addDays(shown.value, -dayOfWeek(shown.value)))
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i)))
const weekEnd = computed(() => days.value[6])
const thisWeek = computed(() => addDays(props.today, -dayOfWeek(props.today)))
// Back to the week with today in it, wherever the arrows (or the selected day) left it.
const backToThisWeek = () => (shift.value += diffDays(thisWeek.value, weekStart.value) / 7)
const weekTitle = computed(() => {
  if (weekStart.value === thisWeek.value) return 'This week'
  if (weekStart.value === addDays(thisWeek.value, -7)) return 'Last week'
  if (weekStart.value === addDays(thisWeek.value, 7)) return 'Next week'
  return `${formatShortDate(weekStart.value)} – ${formatShortDate(weekEnd.value)}`
})

// Shortest periods first: daily, then weekly, every 2 weeks, monthly, yearly.
const PERIOD_ORDER = { day: 0, week: 1, biweek: 2, month: 3, year: 4 }

// Habits, then chores; within each, ones already finished sink to the bottom and dim,
// and the rest go shortest period first.
// "Finished" is judged as of today in this week, as of Saturday in a past week (so last
// week shows what got done then; daily habits only count today), and never in a week
// still to come.
const asOf = computed(() => (weekEnd.value < props.today ? weekEnd.value : weekStart.value > props.today ? null : props.today))
const finished = (task) => {
  if (!asOf.value) return false
  if (task.period === 'day' && asOf.value !== props.today) return false // a past Saturday says little about a daily habit
  const ranges = pauseRangesFor(task, state.pauses, state.vacations)
  const p = workingPeriod(task, state.completions, asOf.value, ranges)
  return sumRange(dailyTotals(task, state.completions, undefined, ranges), p.start, asOf.value) >= Number(task.target)
}
const routines = computed(() =>
  state.tasks
    .filter((t) => t.active && t.scope === context.scope && t.active_since <= weekEnd.value)
    .filter((t) => periodInSeason(t, { start: weekStart.value, end: weekEnd.value })) // out of season all week: left out
    .map((t) => ({ t, done: finished(t) }))
    .sort(
      (a, b) =>
        (a.t.kind === b.t.kind ? 0 : a.t.kind === 'habit' ? -1 : 1) ||
        a.done - b.done ||
        PERIOD_ORDER[a.t.period] - PERIOD_ORDER[b.t.period] ||
        a.t.sort_order - b.t.sort_order,
    )
    .map(({ t }) => t),
)

// "300/1k" rather than "300/1,000" so big targets fit.
const short = (n) => Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const UNIT = { week: 'wk', biweek: '2wk', month: 'mo', year: 'yr' }

// One row per routine. Each day gets a mark:
//   done / part  logged (part = some of a daily goal)
//   missed       a daily routine with nothing logged on a past day (open circle)
//   none         nothing logged, but nothing was needed that day
//   off          paused, on vacation, skipped or out of season
//   future       hasn't happened yet (tiny gray dot, like none)
// Routines due on a set day get a ring on that day, colored by where it stands
// (upcoming, due today, in grace, missed, done), and a band over the grace days.
const rows = computed(() =>
  routines.value.map((task) => {
    // `totals` counts late check-offs toward the period they were for; the marks show
    // what was logged on each day.
    const totals = dailyTotals(task, state.completions, undefined, pauseRangesFor(task, state.pauses, state.vacations))
    const logged = new Map()
    for (const c of state.completions) if (c.task_id === task.id) logged.set(c.date, (logged.get(c.date) ?? 0) + Number(c.amount))
    const target = Number(task.target)
    const daily = task.period === 'day'
    const off = (d) => isPausedOn(task, d, state.pauses, state.vacations)
    const cells = days.value.map((d) => {
      if (d > props.today || d < task.active_since) return { state: 'future' }
      const amount = logged.get(d) ?? 0
      if (amount > 0) return { state: daily && amount < target ? 'part' : 'full' }
      if (off(d) || !inSeason(task, d)) return { state: 'off' }
      return { state: daily && d < props.today ? 'missed' : 'none' }
    })

    // Due days (and grace) that touch this week. A week can touch two months, and grace
    // from a due day late last week can run into this one, so last week's period counts too.
    let band = null
    const periods = new Map([addDays(weekStart.value, -1), ...days.value].map((d) => [periodFor(task, d).start, periodFor(task, d)]))
    for (const p of periods.values()) {
      if (!hasDue(task) || dueBeforeStart(task, p)) continue
      const due = dueDate(task, p)
      const until = task.kind === 'chore' ? graceEnd(task, p) : due
      if (until < weekStart.value || due > weekEnd.value) continue
      const i = days.value.indexOf(due) // -1 when it was due last week
      const met = sumRange(totals, p.start, minDate(props.today, p.end)) >= target
      const due_state = met
        ? 'met'
        : isPeriodPaused(task, p, state.pauses, state.vacations)
          ? 'off'
          : props.today < due
            ? 'upcoming'
            : props.today === due
              ? 'today'
              : props.today <= until
                ? 'grace'
                : 'late'
      if (i >= 0) cells[i] = { ...cells[i], ring: due_state, state: due_state === 'late' && cells[i].state === 'none' ? 'missed' : cells[i].state }
      // Grace that runs past either edge of the week is squared off there.
      const wrapsIn = i < 0
      const wrapsOut = until > weekEnd.value
      const from = wrapsIn ? 0 : i
      const to = wrapsOut ? 6 : days.value.indexOf(until)
      if (to > from || wrapsIn || wrapsOut) band = { from, to, state: due_state, wrapsIn, wrapsOut }
    }

    // Counted goals: "1/4 wk", turning the kind color once met and red if the period ended short.
    let tally = null
    if (!daily) {
      const p = periodFor(task, shown.value)
      const done = sumRange(totals, p.start, p.end)
      const ended = p.end < props.today && done < target && !isPeriodPaused(task, p, state.pauses, state.vacations)
      tally = { text: `${short(done)}/${short(target)}`, unit: UNIT[task.period], state: done >= target ? 'met' : ended ? 'late' : '' }
    }
    return { task, cells, band, tally, finished: finished(task) }
  }),
)

// Today's column gets a soft highlight behind every row.
const todayIndex = computed(() => days.value.indexOf(props.today))

// Routines due in the next 7 days plus dated to-dos, soonest first.
const coming = computed(() => {
  const routines = upcomingItems(state.tasks.filter((t) => t.scope === context.scope), state.completions, props.today, 7)
    .map((i) => ({ key: `r${i.task.id}${i.date}`, date: i.date, name: i.task.name, id: i.task.id, todo: false, kind: i.task.kind }))
  const todos = state.todos
    .filter((t) => t.scope === context.scope && !t.done_on && t.due_date > props.today && t.due_date <= addDays(props.today, 7))
    .map((t) => ({ key: `t${t.id}`, date: t.due_date, name: t.title, id: t.id, todo: true, kind: 'todo' }))
  // Dated steps inside open to-dos, labeled with their to-do.
  const steps = state.todos
    .filter((t) => t.scope === context.scope && !t.done_on)
    .flatMap((t) =>
      (t.steps ?? [])
        .filter((s) => !s.done && s.due_date > props.today && s.due_date <= addDays(props.today, 7))
        .map((s) => ({ key: `s${s.id}`, date: s.due_date, name: s.text, parent: t.title, id: t.id, todo: true, kind: 'todo' })),
    )
  return [...routines, ...todos, ...steps].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
})
const when = (date) => {
  if (date === addDays(props.today, 1)) return 'Tomorrow'
  if (date <= addDays(props.today, 6)) return WEEKDAY_SHORT[dayOfWeek(date)]
  return formatShortDate(date)
}
</script>

<template>
  <div class="overview">
    <section>
      <h2 class="section-head week-head">
        <span>
          {{ weekTitle }}
          <button v-if="weekStart !== thisWeek" class="back" @click="backToThisWeek">Back to this week</button>
        </span>
        <span class="nav">
          <button class="arrow" aria-label="Previous week" @click="shift--"><Icon name="chevron" class="flip" /></button>
          <button class="arrow" aria-label="Next week" @click="shift++"><Icon name="chevron" /></button>
        </span>
      </h2>
      <div class="week">
        <i v-if="todayIndex >= 0" class="today-col" :style="{ '--col': todayIndex }"></i>
        <div class="grid head-row">
          <span></span>
          <span v-for="(d, i) in days" :key="d" class="dh" :class="{ now: d === today }" :style="{ gridColumn: i + 2 }">{{ 'SMTWTFS'[i] }}</span>
        </div>
        <button v-for="r in rows" :key="r.task.id" class="grid row" :class="[r.task.kind, { finished: r.finished }]" @click="emit('select', r.task.id)">
          <span class="name"><i class="dot" :class="r.task.kind"></i>{{ r.task.name }}</span>
          <i v-if="r.band" class="band" :class="[r.band.state, { 'wraps-in': r.band.wrapsIn, 'wraps-out': r.band.wrapsOut }]" :style="{ gridColumn: `${r.band.from + 2} / ${r.band.to + 3}` }"></i>
          <span v-for="(c, i) in r.cells" :key="i" class="cell" :class="[c.state, c.ring && `ring ${c.ring}`]" :style="{ gridColumn: i + 2 }"><i></i></span>
          <span v-if="r.tally" class="tally" :class="r.tally.state">{{ r.tally.text }}<small>{{ r.tally.unit }}</small></span>
        </button>
      </div>
      <p v-if="!rows.length" class="empty">No routines yet.</p>
    </section>

    <section>
      <h2 class="section-head">Coming up</h2>
      <button v-for="item in coming" :key="item.key" class="soon" @click="emit(item.todo ? 'select-todo' : 'select', item.id)">
        <span class="when">{{ when(item.date) }}</span>
        <span class="name"><i class="dot" :class="item.kind"></i>{{ item.name }}<small v-if="item.parent" class="parent"> · {{ item.parent }}</small></span>
      </button>
      <p v-if="!coming.length" class="empty">Nothing due in the next week.</p>
    </section>
  </div>
</template>

<style scoped>
.overview section + section {
  margin-top: 8px;
}
.overview .section-head {
  margin-top: 4px;
}
.week {
  position: relative;
}
.week-head {
  align-items: center;
}
.back {
  margin-left: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 600;
}
.nav {
  display: flex;
  gap: 2px;
  margin: -4px -4px -4px 0;
}
.arrow {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--muted);
}
.arrow:hover {
  background: var(--hover);
}
.arrow svg {
  width: 13px;
  height: 13px;
}
.flip {
  transform: rotate(180deg);
}
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(7, 22px) 72px;
  grid-template-rows: auto;
  align-items: center;
  column-gap: 4px;
}
.grid > * {
  grid-row: 1;
}
.name {
  grid-column: 1;
}
.tally {
  grid-column: 9;
}
/* A soft band down today's column, behind every row. Counted from the right edge:
   8px padding, the 72px tally column, then 22px day columns with 4px gaps. */
.today-col {
  position: absolute;
  top: 2px;
  bottom: 0;
  right: calc(8px + 72px + 4px + (6 - var(--col)) * 26px - 3px);
  width: 28px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-soft) 35%, transparent);
}
.head-row {
  position: relative;
  padding: 6px 8px 2px;
}
.dh {
  text-align: center;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--muted);
}
.dh.now {
  color: var(--accent);
}
.row {
  position: relative;
  width: 100%;
  margin: 0;
  padding: 6px 8px;
  border: 0;
  border-radius: 7px;
  background: none;
  text-align: left;
}
.row:hover {
  background: color-mix(in srgb, var(--hover) 70%, transparent);
}
.soon:hover {
  background: var(--hover);
}
.row.finished > * {
  opacity: 0.45;
}
.row.habit {
  --kind: var(--habit);
}
.row.chore {
  --kind: var(--chore);
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.87rem;
}
.cell {
  position: relative;
  display: grid;
  place-items: center;
  height: 18px;
}
.cell i {
  position: relative;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--track);
}
.cell.full i {
  width: 11px;
  height: 11px;
  background: var(--kind);
}
.cell.part i {
  width: 11px;
  height: 11px;
  background: color-mix(in srgb, var(--kind) 40%, transparent);
}
.cell.off i {
  width: 9px;
  height: 2px;
  border-radius: 1px;
}
/* Days still to come: the same tiny gray dot as a day that needed nothing. A due ring
   takes its place. */
.cell.ring.future i,
.cell.ring.none i {
  background: none;
}
/* Missed: an open circle. */
.cell.missed i {
  width: 9px;
  height: 9px;
  background: none;
  box-shadow: inset 0 0 0 1.5px var(--faint);
}
/* The day it's due: a ring around the mark. */
.cell.ring::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 17px;
  height: 17px;
  margin: -9.5px 0 0 -9.5px;
  border: 1.5px solid var(--faint);
  border-radius: 50%;
}
.cell.ring.met::after {
  border-color: var(--kind);
}
.cell.ring.today::after,
.cell.ring.grace::after {
  border-color: var(--due);
}
.cell.ring.late::after {
  border-color: var(--late);
}
/* Grace days after the due day. */
.band {
  align-self: center;
  height: 21px;
  margin: 0 -2px;
  border-radius: 11px;
  background: var(--hover);
}
.band.wraps-in {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.band.wraps-out {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.band.met {
  background: color-mix(in srgb, var(--kind) 14%, transparent);
}
.band.today,
.band.grace {
  background: color-mix(in srgb, var(--due) 18%, transparent);
}
.band.late {
  background: color-mix(in srgb, var(--late) 13%, transparent);
}
.tally {
  text-align: right;
  font-size: 0.75rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.tally small {
  /* Same width for every period, so the counts line up down the column. */
  display: inline-block;
  width: 24px;
  margin-left: 3px;
  text-align: left;
  font-size: 0.66rem;
  color: var(--faint);
}
.tally.met {
  color: var(--kind);
  font-weight: 600;
}
.tally.late {
  color: var(--late);
}
.soon {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: 7px;
  background: none;
  text-align: left;
}
.when {
  flex: none;
  width: 70px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--due);
}
.soon .name {
  flex: 1;
  min-width: 0;
}
/* A short vertical pip in the item's color: habits blue, chores green, to-dos gray. */
.dot {
  display: inline-block;
  width: 3px;
  height: 11px;
  margin: 0 9px 1px 0;
  border-radius: 2px;
  vertical-align: middle;
}
.dot.habit {
  background: var(--habit);
}
.dot.chore {
  background: var(--chore);
}
.dot.todo {
  background: var(--faint);
}
.parent {
  color: var(--muted);
  font-size: 0.8rem;
}
.empty {
  margin: 10px 8px;
  font-size: 0.85rem;
  color: var(--muted);
}
</style>
