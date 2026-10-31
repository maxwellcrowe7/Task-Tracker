<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { state, addCompletion, removeLastCompletion, undoSkip } from '../data/store.js'
import { skipWithUndo } from '../lib/quickActions.js'
import { addDays, dayOfWeek, endOfMonth, startOfMonth } from '../domain/dates.js'
import { periodFor, periodUnit } from '../domain/periods.js'
import { dailyTotals, sumRange } from '../domain/totals.js'
import { computeStreak } from '../domain/streak.js'
import { computeStats } from '../domain/stats.js'
import { isPausedOn, skipOn } from '../domain/pauses.js'
import { inSeason, hasSeason } from '../domain/season.js'
import { describeDue, hasDue } from '../domain/due.js'
import { formatDate, formatShortDate } from '../lib/format.js'
import Icon from './Icon.vue'

// Everything about one task: streak and stats, a month calendar, logging for any past
// day, notes, and skip. Used as the desktop side panel and as the phone detail page.
const props = defineProps({
  id: { type: String, required: true },
  today: { type: String, required: true },
  closable: { type: Boolean, default: false },
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
const totals = computed(() => dailyTotals(task.value, state.completions))
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
const isCurrentMonth = computed(() => month.value === startOfMonth(props.today))
const monthLabel = computed(() => formatDate(month.value, { month: 'long', year: 'numeric' }))
const prevMonth = () => (month.value = startOfMonth(addDays(month.value, -1)))
const nextMonth = () => (month.value = addDays(endOfMonth(month.value), 1))
const periodMet = (p) => sumRange(totals.value, p.start, p.end) >= target.value

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
        <router-link :to="`/manage/${task.id}`" class="btn small">Edit</router-link>
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
        <button class="arrow" aria-label="Next month" :disabled="isCurrentMonth" @click="nextMonth"><Icon name="chevron" /></button>
      </div>
      <div class="weekdays" aria-hidden="true"><span v-for="(d, i) in WEEKDAYS" :key="i">{{ d }}</span></div>
      <div v-for="row in rows" :key="row.start" class="week" :class="{ met: row.met, skipped: row.skipped }">
        <button
          v-for="date in row.days"
          :key="date"
          class="day"
          :class="{
            outside: date.slice(0, 7) !== month.slice(0, 7),
            met: dayMet(date),
            skipped: !wholeRows && !dayMet(date) && skippedOn(date),
            today: date === today,
            selected: date === selected,
            early: date < task.active_since || !inSeason(task, date),
          }"
          :disabled="date > today"
          :aria-label="formatDate(date)"
          :aria-pressed="date === selected"
          @click="selected = date"
        >
          {{ Number(date.slice(8)) }}<i :class="{ on: logged.has(date) }"></i>
        </button>
      </div>
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
.day.today {
  font-weight: 700;
}
.day.selected {
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
.foot {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
</style>
