<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { state, createTask, updateTask, deleteTask } from '../data/store.js'
import { todayLocal, WEEKDAY_SHORT } from '../domain/dates.js'
import { EDITABLE_FIELDS, newTaskDefaults, normalizeTask, validateTask, pinAllowed, sundayOf } from '../domain/taskRules.js'
import { formatDate } from '../lib/format.js'
import { SEASON_YEAR } from '../domain/season.js'
import Segmented from '../components/Segmented.vue'
import PlaneIcon from '../components/PlaneIcon.vue'

const props = defineProps({ id: { type: String, default: null } })
const router = useRouter()
const today = todayLocal()

const task = computed(() => (props.id ? state.tasks.find((t) => t.id === props.id) : null))
const missing = computed(() => props.id && !task.value)

const start = task.value
  ? Object.fromEntries(EDITABLE_FIELDS.map((f) => [f, task.value[f]]))
  : newTaskDefaults(today)
const form = reactive({ ...start, unit_label: start.unit_label ?? '' })
const errors = ref({})

// A 2-week cycle needs a starting week; default to this one.
watch(
  () => form.period,
  (period) => {
    if (period === 'biweek' && !form.period_anchor) form.period_anchor = sundayOf(today)
  },
)

const kindOptions = [{ value: 'habit', label: 'Habit' }, { value: 'chore', label: 'Chore' }]
const scopeOptions = [{ value: 'personal', label: 'Personal' }, { value: 'work', label: 'Work' }]
const periodOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'biweek', label: 'Bi-week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

const showPin = computed(() => pinAllowed(form.period))
const showGrace = computed(() => form.kind === 'chore' && showPin.value && form.pinned_day != null)
const anchorNote = computed(() =>
  form.period_anchor && sundayOf(form.period_anchor) !== form.period_anchor
    ? `Cycles start on Sundays, so this will be saved as ${formatDate(sundayOf(form.period_anchor))}.`
    : 'Each 2-week cycle starts on a Sunday.',
)

// Season: month + day pickers, stored as dates in the year 2000 (only month-day matters).
const seasonOptions = [{ value: false, label: 'Year-round' }, { value: true, label: 'Seasonal' }]
const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' }),
)
const daysIn = (month) => new Date(Number(SEASON_YEAR), month, 0).getDate()
function toSeasonDate(month, day) {
  const m = Number(month) || 1
  const d = Math.min(Number(day) || 1, daysIn(m)) // e.g. Mar 31 → Feb 29
  return `${SEASON_YEAR}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const seasonal = computed({
  get: () => Boolean(form.season_start && form.season_end),
  set: (on) => {
    form.season_start = on ? `${SEASON_YEAR}-05-01` : null
    form.season_end = on ? `${SEASON_YEAR}-09-30` : null
  },
})
// Two-way month/day bindings for one end of the season ('season_start' or 'season_end').
function seasonPart(field) {
  const month = computed({
    get: () => Number(form[field]?.slice(5, 7) ?? 1),
    set: (m) => (form[field] = toSeasonDate(m, day.value)),
  })
  const day = computed({
    get: () => Number(form[field]?.slice(8, 10) ?? 1),
    set: (d) => (form[field] = toSeasonDate(month.value, d)),
  })
  return { month, day }
}
const from = seasonPart('season_start')
const until = seasonPart('season_end')

const saving = ref(false)
async function save() {
  const row = normalizeTask(form)
  errors.value = validateTask(row)
  if (Object.keys(errors.value).length) return
  saving.value = true
  try {
    if (task.value) await updateTask(task.value, row)
    else await createTask(row)
    router.push('/manage')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm(`Delete "${task.value.name}" and all its history? This can't be undone.`)) return
  await deleteTask(task.value)
  router.push('/manage')
}
</script>

<template>
  <header class="head">
    <router-link to="/manage" class="back">‹ Manage</router-link>
    <h1><span class="brand-text">{{ task ? 'Edit task' : 'New task' }}</span></h1>
  </header>

  <p v-if="missing" class="panel">That task doesn't exist (demo data resets when you reload).</p>

  <form v-else class="panel" novalidate @submit.prevent="save">
    <label class="field">
      <span class="label">Name</span>
      <input v-model="form.name" class="input" autocomplete="off" />
      <span v-if="errors.name" class="error">{{ errors.name }}</span>
    </label>

    <div class="field">
      <span class="label">Type</span>
      <Segmented v-model="form.kind" :options="kindOptions" label="Type" />
      <span class="help">
        {{ form.kind === 'habit'
          ? 'Strict: missing a period breaks the streak. No grace days.'
          : 'No streak. Can have grace days after its due day.' }}
      </span>
    </div>

    <div class="field">
      <span class="label">Area</span>
      <Segmented v-model="form.scope" :options="scopeOptions" label="Area" />
    </div>

    <div class="pair">
      <label class="field">
        <span class="label">Period</span>
        <select v-model="form.period" class="input">
          <option v-for="o in periodOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
      <label class="field">
        <span class="label">Frequency</span>
        <input v-model="form.target" type="number" inputmode="decimal" min="0" class="input" />
        <span v-if="errors.target" class="error">{{ errors.target }}</span>
      </label>
    </div>

    <div class="pair">
      <label class="field">
        <span class="label">Unit (optional)</span>
        <input v-model="form.unit_label" class="input" autocomplete="off" />
      </label>
      <label class="field">
        <span class="label">Increment</span>
        <input v-model="form.quick_add" type="number" inputmode="decimal" min="0" class="input" />
        <span v-if="errors.quick_add" class="error">{{ errors.quick_add }}</span>
      </label>
    </div>

    <label v-if="form.period === 'biweek'" class="field">
      <span class="label">A week the 2-week cycle starts</span>
      <input v-model="form.period_anchor" type="date" class="input" />
      <span class="help">{{ anchorNote }}</span>
      <span v-if="errors.period_anchor" class="error">{{ errors.period_anchor }}</span>
    </label>

    <div v-if="showPin" class="pair">
      <label class="field">
        <span class="label">Due day</span>
        <select v-model="form.pinned_day" class="input">
          <option :value="null">Any day</option>
          <option v-for="(d, i) in WEEKDAY_SHORT" :key="d" :value="i">{{ d }}</option>
        </select>
      </label>
      <label v-if="showGrace" class="field">
        <span class="label">Grace days</span>
        <input v-model="form.grace_days" type="number" inputmode="numeric" min="0" max="6" class="input" />
        <span v-if="errors.grace_days" class="error">{{ errors.grace_days }}</span>
      </label>
    </div>
    <p v-if="showGrace" class="help grace-help">
      Done within the grace days still counts, just marked late. Grace never runs past Saturday.
    </p>

    <label class="field">
      <span class="label">Starting date</span>
      <input v-model="form.active_since" type="date" class="input" :max="today" />
      <span class="help">Completions before this date don't count toward streaks or stats.</span>
      <span v-if="errors.active_since" class="error">{{ errors.active_since }}</span>
    </label>

    <div class="field">
      <span class="label">Season</span>
      <Segmented v-model="seasonal" :options="seasonOptions" label="Season" />
    </div>
    <div v-if="seasonal" class="season">
      <div class="season-row">
        <div class="end">
          <span class="label">From</span>
          <div class="md">
            <select v-model="from.month.value" class="input" aria-label="From month">
              <option v-for="(m, i) in MONTHS" :key="m" :value="i + 1">{{ m }}</option>
            </select>
            <select v-model="from.day.value" class="input" aria-label="From day">
              <option v-for="d in daysIn(from.month.value)" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
        </div>
        <span class="sep" aria-hidden="true">→</span>
        <div class="end">
          <span class="label">To</span>
          <div class="md">
            <select v-model="until.month.value" class="input" aria-label="To month">
              <option v-for="(m, i) in MONTHS" :key="m" :value="i + 1">{{ m }}</option>
            </select>
            <select v-model="until.day.value" class="input" aria-label="To day">
              <option v-for="d in daysIn(until.month.value)" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
        </div>
      </div>
      <p class="help season-help">
        Hidden from Today outside these dates every year. The off-season doesn't break streaks.
      </p>
    </div>

    <button
      type="button"
      class="vac-toggle"
      :class="{ on: form.pauses_on_vacation }"
      :aria-pressed="form.pauses_on_vacation"
      @click="form.pauses_on_vacation = !form.pauses_on_vacation"
    >
      <span class="vac-icon"><PlaneIcon /></span>
      <span>{{ form.pauses_on_vacation ? 'Pauses on vacation' : 'Keeps going on vacation' }}</span>
    </button>

    <div class="buttons">
      <button type="submit" class="btn primary" :disabled="saving">Save</button>
      <router-link to="/manage" class="btn cancel">Cancel</router-link>
      <button v-if="task" type="button" class="btn danger delete" @click="remove">Delete</button>
    </div>
  </form>
</template>

<style scoped>
.head {
  margin-bottom: 12px;
}
.back {
  display: inline-block;
  padding: 6px 0;
  color: var(--habit);
  text-decoration: none;
  font-weight: 600;
}
h1 {
  margin: 4px 0 0;
  font-size: 1.4rem;
}
.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 10px;
}
.grace-help {
  margin: -8px 0 16px;
  font-size: 0.78rem;
  color: var(--muted);
}
.season-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 6px;
  margin-bottom: 8px;
}
.end .label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}
.md {
  display: grid;
  grid-template-columns: 1fr 40px;
  gap: 4px;
}
/* No dropdown arrows, so full month names fit on a phone. */
.md .input {
  padding: 0 4px;
  -webkit-appearance: none;
  appearance: none;
  text-align: center;
  text-align-last: center;
  font-size: 0.95rem;
}
.sep {
  height: 44px;
  line-height: 44px;
  padding: 0 2px;
  color: var(--muted);
  font-weight: 700;
}
.season-help {
  margin: 0 0 16px;
  font-size: 0.78rem;
  color: var(--muted);
}
.vac-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: none;
  background: none;
  color: var(--muted);
  font-weight: 600;
}
.vac-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1.5px dashed var(--muted);
  border-radius: 50%;
  opacity: 0.7;
}
.vac-toggle.on {
  color: var(--text);
}
.vac-toggle.on .vac-icon {
  border: 1.5px solid var(--vacation);
  background: var(--vacation);
  color: #fff;
  opacity: 1;
}
.buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
.cancel {
  display: inline-flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
}
.delete {
  margin-left: auto;
}
</style>
