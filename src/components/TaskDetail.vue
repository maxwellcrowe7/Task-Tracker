<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { state, addCompletion, removeLastCompletion, undoSkip } from '../data/store.js'
import { skipWithUndo } from '../lib/quickActions.js'
import { addDays, dayOfWeek, endOfMonth, startOfMonth } from '../domain/dates.js'
import { periodFor, previousPeriod, periodUnit } from '../domain/periods.js'
import { dailyTotals, sumRange } from '../domain/totals.js'
import { computeStreak } from '../domain/streak.js'
import { computeStats } from '../domain/stats.js'
import { isPausedOn, isPeriodPaused, skipOn, pauseRangesFor } from '../domain/pauses.js'
import { inSeason, hasSeason } from '../domain/season.js'
import { describeDue, hasDue, dueDate, dueBeforeStart } from '../domain/due.js'
import { graceEnd } from '../domain/status.js'
import { formatDate, formatShortDate } from '../lib/format.js'
import Icon from './Icon.vue'

// Everything about one task: streak and stats, a month calendar, logging for any past
// day, notes, and skip. Used as the desktop side panel and as the phone detail page.
const props = defineProps({
  id: { type: String, required: true },
  today: { type: String, required: true },
  closable: { type: Boolean, default: false },
  editable: { type: Boolean, default: true }, // false when already opened from the edit form
})
const emit = defineEmits(['close'])

const task = computed(() => state.tasks.find((t) => t.id === props.id))
const target = computed(() => Number(task.value.target))
const fmt = (n) => Number(n).toLocaleString()
const unit = computed(() => (task.value.unit_label ? ` ${task.value.unit_label}` : ''))

const kicker = computed(() => {
  const t = task.value
  const every = { day: 'daily', week: 'weekly', biweek: 'every 2 weeks', month: 'monthly', year: 'yearly' }[t.period]
  let text = `${t.kind === 'habit' ? 'Habit' : 'Chore'} · ${every}`
  if (hasDue(t)) text += `, due ${describeDue(t)}`
  if (hasSeason(t)) text += ` · ${formatShortDate(t.season_start)} – ${formatShortDate(t.season_end)}`
  return text
})

// Counting totals ignore anything before active_since; `logged` shows every entry.
const totals = computed(() => dailyTotals(task.value, state.completions, undefined, pauseRangesFor(task.value, state.pauses, state.vacations)))
const logged = computed(() => {
  const days = new Map()
  for (const c of state.completions) {
    if (c.task_id === props.id) days.set(c.date, (days.get(c.date) ?? 0) + Number(c.amount))
  }
  return days
})

const streak = computed(() => computeStreak(task.value, state.completions, state.pauses, state.vacations, props.today))
const stats = computed(() => computeStats(task.value, state.completions, state.pauses, state.vacations, props.today))

// ---- Month calendar ----
const month = ref(startOfMonth(props.today))
watch(() => props.id, () => {
  month.value = startOfMonth(props.today)
  selected.value = props.today
  closeCustom()
})
// Routines due on a set day can look ahead a year to see what's coming; others stop at this month.
const lastMonth = computed(() => (hasDue(task.value) ? startOfMonth(addDays(props.today, 365)) : startOfMonth(props.today)))
const monthLabel = computed(() => formatDate(month.value, { month: 'long', year: 'numeric' }))
const prevMonth = () => (month.value = startOfMonth(addDays(month.value, -1)))
const nextMonth = () => (month.value = addDays(endOfMonth(month.value), 1))
const periodMet = (p) => sumRange(totals.value, p.start, p.end) >= target.value

// Due days get a ring and grace days a pill, so you can see when each one is due, past or
// future, done or not. The ring's color says where it stands: gray coming up (or paused),
// amber due now or in grace, red missed, the task's color once done.
function dueMark(date) {
  const t = task.value
  if (!hasDue(t) || date < t.active_since || !inSeason(t, date)) return null
  // The day's own period, or the one before when its grace runs into this one.
  const own = periodFor(t, date)
  const p = [own, previousPeriod(t, own)].find((q) => {
    if (dueBeforeStart(t, q)) return false
    const due = dueDate(t, q)
    return date >= due && date <= (t.kind === 'chore' ? graceEnd(t, q) : due)
  })
  if (!p) return null
  const due = dueDate(t, p)
  const until = t.kind === 'chore' ? graceEnd(t, p) : due
  const met = periodMet(p)
  const standing = met
    ? 'done' // not 'met': that class already styles a finished day
    : isPeriodPaused(t, p, state.pauses, state.vacations)
      ? 'off'
      : props.today < due
        ? 'upcoming'
        : props.today <= until
          ? 'now'
          : 'late'
  return `${date === due ? 'due' : 'grace'} ${standing}`
}
// A pill behind each run of grace days in a row, starting at the due day, like the
// This week panel: { from, to, state } as column indexes (to is exclusive). It's drawn
// one piece per day, so its ends can line up exactly with the ring on the due day.
// When grace runs past Saturday, the pill is squared off at the row's edge and picks
// up again, squared off, at the start of the next row (`wrapsOut` / `wrapsIn`).
function graceBands(days) {
  const bands = []
  days.forEach((date, i) => {
    const mark = dueMark(date)
    if (!mark) return
    const [kind, standing] = mark.split(' ')
    const last = bands.at(-1)
    if (kind === 'grace' && last && last.to === i) last.to = i + 1
    else bands.push({ from: i, to: i + 1, state: standing, wrapsIn: kind === 'grace' && i === 0 })
  })
  for (const b of bands) b.wrapsOut = b.to === 7 && dueMark(addDays(days[6], 1))?.startsWith('grace')
  return bands.filter((b) => b.to - b.from > 1 || b.wrapsIn || b.wrapsOut)
}

// Rows are Sunday–Saturday weeks; weekly and 2-week periods line up with rows, so a met
// period fills the whole row. Daily tasks fill single days; monthly/yearly get a header note.
// Skipped periods are grayed out the same way (whole rows, or single days).
const wholeRows = computed(() => task.value.period === 'week' || task.value.period === 'biweek')
const skippedOn = (date) => Boolean(skipOn(task.value, date, state.pauses))
const rows = computed(() => {
  const last = endOfMonth(month.value)
  const result = []
  for (let start = addDays(month.value, -dayOfWeek(month.value)); start <= last; start = addDays(start, 7)) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
    const met = wholeRows.value && periodMet(periodFor(task.value, start))
    result.push({ start, days, met, skipped: wholeRows.value && !met && skippedOn(start) })
  }
  return result
})
const dayMet = (date) => task.value.period === 'day' && (totals.value.get(date) ?? 0) >= target.value
const monthMet = computed(
  () => (task.value.period === 'month' || task.value.period === 'year') && periodMet(periodFor(task.value, month.value)),
)
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// ---- Selected day: log or fix it ----
const selected = ref(props.today)
const selectedPeriod = computed(() => periodFor(task.value, selected.value))
const selectedAmount = computed(() => logged.value.get(selected.value) ?? 0)
const periodTotal = computed(() => sumRange(totals.value, selectedPeriod.value.start, selectedPeriod.value.end))
const summary = computed(() => {
  if (task.value.period === 'day') return `${fmt(selectedAmount.value)} of ${fmt(target.value)}${unit.value}`
  // The day is in the heading above, so just the amount: "2 completions", "300 putts".
  const n = selectedAmount.value
  const what = unit.value || (n === 1 ? ' completion' : ' completions')
  return `${fmt(n)}${what}`
})
// For weekly-and-longer tasks, the period's progress, shown apart from the day's amount.
const periodSummary = computed(() => {
  if (task.value.period === 'day') return ''
  const name = { week: 'week', biweek: '2 weeks', month: 'month', year: 'year' }[task.value.period]
  return `${fmt(periodTotal.value)} / ${fmt(target.value)} for the ${name}`
})
const selectedSkipped = computed(() => Boolean(skipOn(task.value, selected.value, state.pauses)))
const selectedPaused = computed(() => isPausedOn(task.value, selected.value, state.pauses, state.vacations))
const note = computed(() => {
  if (selected.value < task.value.active_since) return "Before this task's starting date, so it won't count."
  if (!inSeason(task.value, selected.value)) return "Out of season that day, so it doesn't count."
  if (selectedSkipped.value) return '' // shown as a "Skipped" label by the heading instead
  if (selectedPaused.value) return "Paused that day, so this period doesn't count toward the streak or stats."
  return ''
})
const skipLabel = computed(() => {
  if (task.value.period === 'day') return selected.value === props.today ? 'Skip today' : 'Skip this day'
  return `Skip this ${{ week: 'week', biweek: '2 weeks', month: 'month', year: 'year' }[task.value.period]}`
})

const busy = ref(false)
async function run(action) {
  if (busy.value) return
  busy.value = true
  try {
    await action()
  } finally {
    busy.value = false
  }
}
const add = (amount) => run(() => addCompletion(task.value, selected.value, amount))
const remove = () => run(() => removeLastCompletion(task.value, selected.value))
const skip = () => run(() => skipWithUndo(task.value, selected.value, props.today))
const unskip = () => run(() => undoSkip(task.value, selected.value))

const customAmount = ref('')
const customOpen = ref(false)
const customInput = ref(null)
async function openCustom() {
  customOpen.value = true
  await nextTick()
  customInput.value?.focus()
}
function closeCustom() {
  customOpen.value = false
  customAmount.value = ''
}
function addCustom() {
  const amount = Number(customAmount.value)
  if (amount > 0) add(amount).then(closeCustom)
}
</script>

<template>
  <p v-if="!task" class="missing">That task doesn't exist anymore.</p>

  <article v-else class="detail">
    <header class="top">
      <span class="kicker">{{ kicker }}</span>
      <div class="actions">
        <router-link v-if="editable" :to="`/manage/${task.id}`" class="btn small">Edit</router-link>
        <button v-if="closable" class="close" aria-label="Close" @click="emit('close')"><Icon name="close" /></button>
      </div>
    </header>
    <h2>{{ task.name }}</h2>

    <div class="stats">
      <div v-if="task.kind === 'habit'"><b><Icon name="flame" />{{ streak }}</b>{{ periodUnit(task, 1) }} streak</div>
      <div><b>{{ stats.met }}<small>/{{ stats.total }}</small></b>{{ periodUnit(task, 2) }} met</div>
      <div v-if="stats.late"><b>{{ stats.late }}</b>late</div>
    </div>

    <p v-if="task.notes" class="notes">{{ task.notes }}</p>

    <section class="log">
      <div class="log-head">
        <div>
          <h3>
            {{ selected === today ? 'Today' : formatDate(selected) }}
            <span v-if="selectedSkipped" class="pill skipped">Skipped</span>
          </h3>
          <p class="sub">
            {{ summary }}<span v-if="periodSummary" class="period">{{ periodSummary }}</span>
          </p>
        </div>
        <div class="steps">
          <template v-if="task.unit_type === 'quantity'">
            <form v-if="customOpen" class="custom" @submit.prevent="addCustom">
              <input
                ref="customInput"
                v-model="customAmount"
                class="input"
                type="number"
                inputmode="decimal"
                min="0"
                step="any"
                placeholder="Amount"
                aria-label="Custom amount"
                @keydown.esc="closeCustom"
                @blur="!customAmount && closeCustom()"
              />
              <button class="step plus" type="submit" :disabled="!(Number(customAmount) > 0) || busy" @mousedown.prevent>Add</button>
            </form>
            <button v-else class="link custom-open" @click="openCustom">Custom</button>
          </template>
          <template v-if="!customOpen">
            <button class="step" aria-label="Remove last" :disabled="!selectedAmount || busy" @click="remove">−</button>
            <button class="step plus" :aria-label="`Add ${task.quick_add}`" :disabled="busy" @click="add(task.quick_add)">
              {{ task.unit_type === 'quantity' ? `+${fmt(task.quick_add)}` : '+' }}
            </button>
          </template>
        </div>
      </div>
      <p v-if="note" class="note">{{ note }}</p>
    </section>

    <section class="calendar">
      <div class="month-nav">
        <button class="arrow" aria-label="Previous month" @click="prevMonth"><Icon name="chevron" class="flip" /></button>
        <span class="month">{{ monthLabel }}<span v-if="monthMet" class="pill habit">Target met</span></span>
        <button class="arrow" aria-label="Next month" :disabled="month >= lastMonth" @click="nextMonth"><Icon name="chevron" /></button>
      </div>
      <div class="weekdays" aria-hidden="true"><span v-for="(d, i) in WEEKDAYS" :key="i">{{ d }}</span></div>
      <div v-for="row in rows" :key="row.start" class="week" :class="{ met: row.met, skipped: row.skipped }">
        <template v-for="b in graceBands(row.days)" :key="b.from">
          <i
            v-for="c in b.to - b.from"
            :key="c"
            class="band"
            :class="[b.state, { start: c === 1 && !b.wrapsIn, end: c === b.to - b.from && !b.wrapsOut, edge: c === b.to - b.from && b.wrapsOut }]"
            :style="{ gridColumn: b.from + c }"
          ></i>
        </template>
        <button
          v-for="(date, i) in row.days"
          :key="date"
          class="day"
          :class="[dueMark(date), {
            outside: date.slice(0, 7) !== month.slice(0, 7),
            met: dayMet(date),
            skipped: !wholeRows && !dayMet(date) && skippedOn(date),
            today: date === today,
            selected: date === selected,
            logged: hasDue(task) && logged.has(date),
            early: date < task.active_since || !inSeason(task, date),
          }]"
          :disabled="date > today"
          :aria-label="formatDate(date)"
          :aria-pressed="date === selected"
          :style="{ gridColumn: i + 1 }"
          @click="selected = date"
        >
          {{ Number(date.slice(8)) }}<i v-if="!hasDue(task)" :class="{ on: logged.has(date) }"></i>
        </button>
      </div>
      <p v-if="hasDue(task)" class="legend">
        <span><i class="ring"></i>Due</span>
        <span v-if="task.kind === 'chore' && task.grace_days"><i class="tint"></i>Grace</span>
      </p>
    </section>

    <footer class="foot">
      <button v-if="selectedSkipped" class="btn small" :disabled="busy" @click="unskip">Undo skip</button>
      <button v-else-if="!selectedPaused" class="btn small" :disabled="busy" @click="skip">{{ skipLabel }}</button>
    </footer>
  </article>
</template>

<style scoped>
.missing {
  color: var(--muted);
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.kicker {
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
}
.actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.actions .btn {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: var(--text);
}
.close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--muted);
}
.close:hover {
  background: var(--hover);
}
.close svg {
  width: 16px;
  height: 16px;
}
h2 {
  margin: 4px 0 14px;
  font-size: 1.45rem;
  letter-spacing: -0.02em;
}
.stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  font-size: 0.78rem;
  color: var(--muted);
}
.stats b {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.stats b small {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--muted);
}
.stats svg {
  width: 15px;
  height: 15px;
}
.notes {
  margin: 0 0 16px;
  white-space: pre-line;
  line-height: 1.5;
}

.log {
  padding: 12px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.log-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
/* Small enough to sit beside the heading without making the row taller. */
.skipped {
  margin-left: 6px;
  padding: 0 6px;
  font-size: 0.7rem;
  line-height: 16px;
  vertical-align: 1px;
}
h3 {
  margin: 0;
  font-size: 0.95rem;
}
.sub .period {
  margin-left: 9px;
  padding-left: 9px;
  border-left: 1px solid var(--border);
  color: var(--text);
}
.sub,
.note {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.note {
  margin-top: 8px;
}
.steps {
  display: flex;
  gap: 6px;
}
.step {
  min-width: 40px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 1.1rem;
}
.step.plus {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
}
/* Custom amounts are the exception, so just a quiet link until you need it; while it's
   open it takes the place of the − / + buttons. */
.steps {
  align-items: center;
}
.custom {
  display: flex;
  gap: 6px;
}
.custom .input {
  width: 80px;
  height: 36px;
  -moz-appearance: textfield;
}
.custom .input::-webkit-inner-spin-button,
.custom .input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.custom .step {
  font-size: 0.85rem;
}
.custom-open {
  padding: 0 6px;
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 0.8rem;
}
.custom-open:hover {
  color: var(--text);
}

.calendar {
  margin-top: 16px;
}
.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.month {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
}
.arrow {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--muted);
}
.arrow:hover:not(:disabled) {
  background: var(--hover);
}
.arrow svg {
  width: 16px;
  height: 16px;
}
.flip {
  transform: rotate(180deg);
}
.weekdays,
.week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.weekdays span {
  padding: 2px 0 4px;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--muted);
}
.week {
  margin-top: 3px;
  border-radius: 7px;
}
.week.met {
  background: var(--accent-soft);
}
.week.skipped,
.day.skipped {
  background: var(--track);
  color: var(--muted);
}
.day {
  position: relative;
  display: grid;
  place-items: center;
  justify-self: center; /* centered under its weekday letter when the column is wider */
  width: 100%;
  max-width: 44px;
  aspect-ratio: 1;
  max-height: 44px;
  border: 1.5px solid transparent;
  border-radius: 7px;
  background: none;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.day.met {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.day.outside,
.day.early {
  color: var(--faint);
}
/* Today: a bold blue number (white if it's filled in). A box marks another picked day. */
.day.today {
  color: var(--accent);
  font-weight: 800;
}
.day.today.logged {
  color: #fff;
}
.day.selected:not(.today) {
  border-color: var(--accent);
}
.day i {
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
}
.day i.on {
  background: var(--accent);
}
/* Future days can't be picked, but stay readable so due days ahead show clearly. */
.day:disabled {
  opacity: 1;
  color: var(--faint);
}
/* Routines with a due day: a logged day gets a filled circle (instead of a dot), the
   same size as the ring, so a done due day reads as one solid circle. */
.day.logged {
  isolation: isolate;
  color: #fff;
  font-weight: 600;
}
.day.logged::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  width: 29px;
  height: 29px;
  margin: auto;
  border-radius: 50%;
  background: var(--accent);
}
/* The due day: a ring around the number. */
.day.due::after {
  content: '';
  position: absolute;
  /* Centered by the browser (inset 0 + auto margins), so it lands exactly mid-day. */
  inset: 0;
  box-sizing: border-box;
  width: 29px;
  height: 29px;
  margin: auto;
  border: 1.5px solid var(--muted);
  border-radius: 50%;
  pointer-events: none;
}
.day.due.off::after {
  border-color: var(--faint);
}
.day.due.done::after {
  border-color: var(--accent);
}
.day.due.now::after {
  border-color: var(--due);
}
.day.due.late::after {
  border-color: var(--late);
}
/* Grace days: a pill from the due day through the last grace day, exactly as tall as
   the ring (29px) and with its ends on the ring's edge. One piece per day: the first
   starts at the ring, the middle ones bridge the gaps, the last ends a ring's width in. */
.week > * {
  grid-row: 1;
}
.band {
  align-self: center;
  height: 29px;
  margin-right: -3px; /* across the gap to the next day */
  background: color-mix(in srgb, var(--track) 55%, transparent);
}
.band.start {
  margin-left: calc(50% - 14.5px);
  border-radius: 14.5px 0 0 14.5px;
}
.band.end {
  margin-right: calc(50% - 14.5px);
  border-radius: 0 14.5px 14.5px 0;
}
/* Wrapping to the next row: square at the row's right edge (no gap to cross). */
.band.edge {
  margin-right: 0;
}
.band.done {
  background: color-mix(in srgb, var(--accent) 16%, transparent); /* shows on a met week's blue */
}
.band.now {
  background: color-mix(in srgb, var(--due) 18%, transparent);
}
.band.late {
  background: color-mix(in srgb, var(--late) 12%, transparent);
}
.legend {
  display: flex;
  gap: 14px;
  margin: 8px 2px 0;
  font-size: 0.75rem;
  color: var(--muted);
}
.legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.legend i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}
.legend .ring {
  border: 1.5px solid var(--muted);
}
.legend .tint {
  width: 20px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--track) 55%, transparent);
}
.foot {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
</style>
