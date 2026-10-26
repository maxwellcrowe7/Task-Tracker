<script setup>
import { ref, computed } from 'vue'
import { state, addCompletion, removeLastCompletion } from '../data/store.js'
import { addDays, dayOfWeek, endOfMonth, startOfMonth, todayLocal } from '../domain/dates.js'
import { periodFor, periodUnit } from '../domain/periods.js'
import { dailyTotals, sumRange } from '../domain/totals.js'
import { computeStreak } from '../domain/streak.js'
import { computeStats, formatStats } from '../domain/stats.js'
import { isPausedOn, skipOn } from '../domain/pauses.js'
import { inSeason } from '../domain/season.js'
import { formatDate } from '../lib/format.js'

const props = defineProps({ id: { type: String, required: true } })

const today = todayLocal()
const task = computed(() => state.tasks.find((t) => t.id === props.id))
const target = computed(() => Number(task.value.target))
const fmt = (n) => Number(n).toLocaleString()

// Counting totals ignore anything before active_since; `logged` shows every entry.
const totals = computed(() => dailyTotals(task.value, state.completions))
const logged = computed(() => {
  const days = new Map()
  for (const c of state.completions) {
    if (c.task_id === task.value.id) days.set(c.date, (days.get(c.date) ?? 0) + Number(c.amount))
  }
  return days
})

const streak = computed(() => computeStreak(task.value, state.completions, state.pauses, state.vacations, today))
const statLine = computed(() =>
  formatStats(task.value, computeStats(task.value, state.completions, state.pauses, state.vacations, today)),
)

// ---- Month grid ----

const month = ref(startOfMonth(today))
const isCurrentMonth = computed(() => month.value === startOfMonth(today))
const monthLabel = computed(() => formatDate(month.value, { month: 'long', year: 'numeric' }))
const prevMonth = () => (month.value = startOfMonth(addDays(month.value, -1)))
const nextMonth = () => (month.value = addDays(endOfMonth(month.value), 1))

const periodMet = (period) => sumRange(totals.value, period.start, period.end) >= target.value

// Rows are Sunday–Saturday weeks. Weekly and 2-week periods always line up with rows,
// so a met period fills the whole row; daily tasks fill single days.
const rows = computed(() => {
  const last = endOfMonth(month.value)
  const wholeRows = task.value.period === 'week' || task.value.period === 'biweek'
  const result = []
  for (let start = addDays(month.value, -dayOfWeek(month.value)); start <= last; start = addDays(start, 7)) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
    result.push({ start, days, met: wholeRows && periodMet(periodFor(task.value, start)) })
  }
  return result
})
const dayMet = (date) => task.value.period === 'day' && (totals.value.get(date) ?? 0) >= target.value
// Monthly and yearly targets can't fill cells, so the month header says when they're met.
const monthMet = computed(
  () => (task.value.period === 'month' || task.value.period === 'year') && periodMet(periodFor(task.value, month.value)),
)
const metLabel = computed(() => (task.value.period === 'year' ? 'Year target met' : 'Target met'))

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// ---- Selected day ----

const selected = ref(today)
const selectedPeriod = computed(() => periodFor(task.value, selected.value))
const selectedAmount = computed(() => logged.value.get(selected.value) ?? 0)
const periodTotal = computed(() => sumRange(totals.value, selectedPeriod.value.start, selectedPeriod.value.end))
const summary = computed(() => {
  const amount = fmt(selectedAmount.value)
  if (task.value.period === 'day') return `${amount} of ${fmt(target.value)}${unit.value} logged`
  const current = selectedPeriod.value.start === periodFor(task.value, today).start
  const name = { week: 'week', biweek: '2 weeks', month: 'month', year: 'year' }[task.value.period]
  return `${amount}${unit.value} logged · ${current ? 'This' : 'That'} ${name}: ${fmt(periodTotal.value)} / ${fmt(target.value)}`
})
const selectedPaused = computed(() => isPausedOn(task.value, selected.value, state.pauses, state.vacations))
const selectedSkipped = computed(() => Boolean(skipOn(task.value, selected.value, state.pauses)))
const beforeStart = computed(() => selected.value < task.value.active_since)
const offSeason = computed(() => !inSeason(task.value, selected.value))
const unit = computed(() => (task.value.unit_label ? ` ${task.value.unit_label}` : ''))

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

const customAmount = ref('')
function addCustom() {
  const amount = Number(customAmount.value)
  if (amount > 0) add(amount).then(() => (customAmount.value = ''))
}
</script>

<template>
  <router-link to="/" class="back">‹ Today</router-link>

  <p v-if="!task" class="panel">That task doesn't exist (demo data resets when you reload).</p>

  <template v-else>
    <header class="head" :class="task.kind">
      <h1>{{ task.name }}</h1>
      <span v-if="streak" class="pill habit">🔥 {{ streak }} {{ periodUnit(task, streak) }}</span>
    </header>
    <p class="stat">{{ statLine }}</p>
    <p v-if="task.notes" class="notes">{{ task.notes }}</p>

    <section class="panel calendar">
      <div class="month-nav">
        <button class="arrow" aria-label="Previous month" @click="prevMonth">‹</button>
        <div class="month">
          <span>{{ monthLabel }}</span>
          <span v-if="monthMet" class="pill chore">{{ metLabel }}</span>
        </div>
        <button class="arrow" aria-label="Next month" :disabled="isCurrentMonth" @click="nextMonth">›</button>
      </div>

      <div class="weekdays" aria-hidden="true">
        <span v-for="(d, i) in WEEKDAYS" :key="i">{{ d }}</span>
      </div>

      <div v-for="row in rows" :key="row.start" class="week" :class="{ met: row.met }">
        <button
          v-for="date in row.days"
          :key="date"
          class="day"
          :class="{
            outside: date.slice(0, 7) !== month.slice(0, 7),
            met: dayMet(date),
            today: date === today,
            selected: date === selected,
            early: date < task.active_since || !inSeason(task, date),
          }"
          :disabled="date > today"
          :aria-label="formatDate(date)"
          :aria-pressed="date === selected"
          @click="selected = date"
        >
          <span class="num">{{ Number(date.slice(8)) }}</span>
          <span class="dot" :class="{ on: logged.has(date) }"></span>
        </button>
      </div>
    </section>

    <section class="panel day-panel" :class="task.kind">
      <div class="day-head">
        <div>
          <h2>{{ selected === today ? 'Today' : formatDate(selected) }}</h2>
          <p class="sub">{{ summary }}</p>
        </div>
        <div class="buttons">
          <button class="step" aria-label="Remove last" :disabled="!selectedAmount || busy" @click="remove">−</button>
          <button class="step plus" :aria-label="`Add ${task.quick_add}`" :disabled="busy" @click="add(task.quick_add)">
            {{ task.unit_type === 'quantity' ? `+${fmt(task.quick_add)}` : '+' }}
          </button>
        </div>
      </div>

      <form v-if="task.unit_type === 'quantity'" class="custom" @submit.prevent="addCustom">
        <input v-model="customAmount" type="number" inputmode="decimal" min="0" step="any" placeholder="Custom amount" />
        <button type="submit" :disabled="!(Number(customAmount) > 0) || busy">Add</button>
      </form>

      <p v-if="beforeStart" class="note">This is before the task's starting date, so it won't count.</p>
      <p v-else-if="offSeason" class="note">Out of season on this day, so it doesn't count toward the streak or stats.</p>
      <p v-else-if="selectedSkipped" class="note">Skipped, so this period doesn't count toward the streak or stats.</p>
      <p v-else-if="selectedPaused" class="note">Paused on this day, so this period doesn't count toward the streak or stats.</p>
    </section>
  </template>
</template>

<style scoped>
.back {
  display: inline-block;
  padding: 6px 0;
  color: var(--habit);
  text-decoration: none;
  font-weight: 600;
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  padding-left: 10px;
  border-left: 4px solid var(--habit);
}
.head.chore {
  border-left-color: var(--chore);
}
h1 {
  margin: 0;
  font-size: 1.4rem;
}
.stat {
  margin: 6px 0 14px;
  font-size: 0.85rem;
  color: var(--muted);
}
.notes {
  margin: -8px 0 14px;
  font-size: 0.9rem;
  white-space: pre-line;
}
.calendar {
  padding: 10px;
}
.month-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.month {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}
.arrow {
  width: 44px;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  font-size: 1.4rem;
  line-height: 1;
}
.weekdays,
.week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.weekdays span {
  padding: 4px 0;
  text-align: center;
  font-size: 0.75rem;
  color: var(--muted);
}
.week {
  margin-top: 4px;
  border-radius: 10px;
}
.week.met {
  background: var(--met);
}
.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 46px;
  margin: 0 2px;
  border: 2px solid transparent;
  border-radius: 10px;
  background: none;
}
.day.met {
  background: var(--met);
}
.day.outside .num,
.day.early .num {
  color: var(--muted);
  opacity: 0.6;
}
.day.today .num {
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.day.selected {
  border-color: var(--text);
}
.day:disabled {
  opacity: 0.3;
}
.num {
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.dot.on {
  background: var(--text);
}
.day-panel {
  margin-top: 12px;
  --accent: var(--habit);
}
.day-panel.chore {
  --accent: var(--chore);
}
.day-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
h2 {
  margin: 0;
  font-size: 1.05rem;
}
.sub {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: var(--muted);
}
.buttons {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.step {
  min-width: 48px;
  height: 48px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  font-size: 1.3rem;
  line-height: 1;
}
.step.plus {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--surface);
  font-size: 1.1rem;
  font-weight: 700;
}
.custom {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.custom input {
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
}
.custom button {
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}
.note {
  margin: 10px 0 0;
  font-size: 0.8rem;
  color: var(--muted);
}
</style>
