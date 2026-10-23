<script setup>
import { ref, computed } from 'vue'
import { state, addCompletion, removeLastCompletion } from '../data/store.js'
import { periodFor, periodUnit } from '../domain/periods.js'
import { dailyTotals, sumRange } from '../domain/totals.js'
import { computeStreak } from '../domain/streak.js'
import { computeStats, formatStats } from '../domain/stats.js'
import { pinStatus } from '../domain/status.js'
import { isPausedOn } from '../domain/pauses.js'

// Progress, pin status and the +/− buttons are for the selected day.
// Streak and the stat line are always "as of today".
const props = defineProps({
  task: { type: Object, required: true },
  date: { type: String, required: true },
  today: { type: String, required: true },
})

const isHabit = computed(() => props.task.kind === 'habit')
const isQuantity = computed(() => props.task.unit_type === 'quantity')
const target = computed(() => Number(props.task.target))

const period = computed(() => periodFor(props.task, props.date))
const totals = computed(() => dailyTotals(props.task, state.completions))
const progress = computed(() => sumRange(totals.value, period.value.start, props.date))
const dayAmount = computed(() => totals.value.get(props.date) ?? 0)
const canRemove = computed(() => state.completions.some((c) => c.task_id === props.task.id && c.date === props.date))

const paused = computed(() => isPausedOn(props.task, props.date, state.pauses, state.vacations))
const pin = computed(() => pinStatus(props.task, state.completions, props.date))
const pinTone = computed(
  () => ({ upcoming: '', due: 'amber', grace: 'amber', overdue: 'amber-strong', done: 'chore' })[pin.value?.state] ?? '',
)

const streak = computed(() => computeStreak(props.task, state.completions, state.pauses, state.vacations, props.today))
const statLine = computed(() =>
  formatStats(props.task, computeStats(props.task, state.completions, state.pauses, state.vacations, props.today)),
)

const periodWord = computed(() => {
  if (props.task.period === 'day') return ''
  const current = periodFor(props.task, props.today).start === period.value.start
  const name = { week: 'week', biweek: '2 weeks', month: 'month', year: 'year' }[props.task.period]
  return `${current ? 'this' : 'that'} ${name}`
})
const progressText = computed(() => {
  const unit = props.task.unit_label ? ` ${props.task.unit_label}` : ''
  let text = `${fmt(progress.value)} / ${fmt(target.value)}${unit}`
  if (periodWord.value) text += ` ${periodWord.value}`
  if (props.task.period !== 'day' && dayAmount.value > 0) {
    text += ` · ${fmt(dayAmount.value)} ${props.date === props.today ? 'today' : 'this day'}`
  }
  return text
})
const fmt = (n) => Number(n).toLocaleString()

const expanded = ref(false)

const fill = computed(() => `${Math.min(100, (progress.value / target.value) * 100)}%`)

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
const add = () => run(() => addCompletion(props.task, props.date))
const remove = () => run(() => removeLastCompletion(props.task, props.date))

const customAmount = ref('')
function addCustom() {
  const amount = Number(customAmount.value)
  if (!(amount > 0)) return
  run(() => addCompletion(props.task, props.date, amount)).then(() => (customAmount.value = ''))
}
</script>

<template>
  <article class="card" :class="[task.kind, { paused, expanded }]">
    <div class="row">
      <button class="summary" :aria-expanded="expanded" @click="expanded = !expanded">
        <span class="name">
          <span class="sr-only">{{ isHabit ? 'Habit:' : 'Chore:' }}</span>
          {{ task.name }}
        </span>
        <span class="meta">
          <span class="count">{{ fmt(progress) }}/{{ fmt(target) }}</span>
          <span v-if="paused" class="pill">Paused</span>
          <span v-else-if="pin" class="pill" :class="pinTone">{{ pin.label }}</span>
          <span v-if="streak" class="pill habit">🔥 {{ streak }} {{ periodUnit(task, streak) }}</span>
        </span>
      </button>
      <div class="buttons">
        <button class="step" aria-label="Remove last" :disabled="!canRemove || busy" @click="remove">−</button>
        <button class="step plus" :aria-label="`Add ${task.quick_add}`" :disabled="busy" @click="add">
          {{ isQuantity ? `+${fmt(task.quick_add)}` : '+' }}
        </button>
      </div>
    </div>

    <div v-if="expanded" class="details">
      <p class="progress">{{ progressText }}</p>
      <form v-if="isQuantity" class="custom" @submit.prevent="addCustom">
        <input v-model="customAmount" type="number" inputmode="decimal" min="0" step="any" placeholder="Custom amount" />
        <button type="submit" :disabled="!(Number(customAmount) > 0) || busy">Add</button>
      </form>
      <div class="foot">
        <p class="stat">{{ statLine }}</p>
        <router-link :to="`/task/${task.id}`" class="history">History ›</router-link>
      </div>
    </div>

    <div class="track" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" :aria-valuemax="target">
      <div class="bar" :style="{ width: fill }"></div>
    </div>
  </article>
</template>

<style scoped>
.card {
  --accent: var(--habit);
  --accent-2: var(--habit-2);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}
.card.chore {
  --accent: var(--chore);
  --accent-2: var(--chore-2);
}
.card.paused {
  opacity: 0.55;
  filter: grayscale(0.8);
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 10px 0;
}
.summary {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 2px 0 2px 12px;
  border: none;
  background: none;
  text-align: left;
}
.name {
  font-weight: 600;
  font-size: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.count {
  font-size: 0.85rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.meta .pill {
  padding: 1px 7px;
  font-size: 0.72rem;
}
.buttons {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.step {
  min-width: 44px;
  height: 44px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  font-size: 1.3rem;
  line-height: 1;
}
.step.plus {
  border-color: transparent;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: var(--surface);
  font-size: 1.1rem;
  font-weight: 700;
}
.details {
  padding: 0 12px 12px;
}
.progress {
  margin: 0;
  font-size: 0.9rem;
}
.custom {
  display: flex;
  gap: 8px;
  margin-top: 8px;
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
.foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.history {
  flex-shrink: 0;
  padding: 10px 0 2px;
  color: var(--accent);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
}
.stat {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: var(--muted);
}
.track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: var(--track);
}
.bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  transition: width 0.2s;
}
</style>
