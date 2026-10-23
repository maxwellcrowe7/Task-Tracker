<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { state, createTask, updateTask, deleteTask } from '../data/store.js'
import { todayLocal, WEEKDAY_SHORT } from '../domain/dates.js'
import { EDITABLE_FIELDS, newTaskDefaults, normalizeTask, validateTask, pinAllowed, sundayOf } from '../domain/taskRules.js'
import { formatDate } from '../lib/format.js'
import Segmented from '../components/Segmented.vue'

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
const unitOptions = [{ value: 'occurrence', label: 'Times' }, { value: 'quantity', label: 'Amount' }]
const periodOptions = [
  { value: 'day', label: 'Every day' },
  { value: 'week', label: 'Every week (Sun–Sat)' },
  { value: 'biweek', label: 'Every 2 weeks' },
  { value: 'month', label: 'Every month' },
]
const PER = { day: 'day', week: 'week', biweek: '2 weeks', month: 'month' }

const showPin = computed(() => pinAllowed(form.period))
const showGrace = computed(() => form.kind === 'chore' && showPin.value && form.pinned_day != null)
const anchorNote = computed(() =>
  form.period_anchor && sundayOf(form.period_anchor) !== form.period_anchor
    ? `Cycles start on Sundays, so this will be saved as ${formatDate(sundayOf(form.period_anchor))}.`
    : 'Each 2-week cycle starts on a Sunday.',
)

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
    <h1>{{ task ? 'Edit task' : 'New task' }}</h1>
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

    <label class="field">
      <span class="label">How often</span>
      <select v-model="form.period" class="input">
        <option v-for="o in periodOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </label>

    <label v-if="form.period === 'biweek'" class="field">
      <span class="label">A week the 2-week cycle starts</span>
      <input v-model="form.period_anchor" type="date" class="input" />
      <span class="help">{{ anchorNote }}</span>
      <span v-if="errors.period_anchor" class="error">{{ errors.period_anchor }}</span>
    </label>

    <div class="field">
      <span class="label">Count by</span>
      <Segmented v-model="form.unit_type" :options="unitOptions" label="Count by" />
      <span class="help">
        {{ form.unit_type === 'occurrence' ? 'Each + adds 1.' : 'Each + adds an amount, e.g. 50 putts.' }}
      </span>
    </div>

    <div class="pair">
      <label class="field">
        <span class="label">Target per {{ PER[form.period] }}</span>
        <input v-model="form.target" type="number" inputmode="decimal" min="0" class="input" />
        <span v-if="errors.target" class="error">{{ errors.target }}</span>
      </label>
      <label v-if="form.unit_type === 'quantity'" class="field">
        <span class="label">Unit (optional)</span>
        <input v-model="form.unit_label" class="input" placeholder="putts" />
      </label>
    </div>

    <label v-if="form.unit_type === 'quantity'" class="field">
      <span class="label">+ button adds</span>
      <input v-model="form.quick_add" type="number" inputmode="decimal" min="0" class="input" />
      <span v-if="errors.quick_add" class="error">{{ errors.quick_add }}</span>
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
      <span class="label">Counts from</span>
      <input v-model="form.active_since" type="date" class="input" :max="today" />
      <span class="help">Completions before this date don't count toward streaks or stats.</span>
      <span v-if="errors.active_since" class="error">{{ errors.active_since }}</span>
    </label>

    <label class="check">
      <input v-model="form.pauses_on_vacation" type="checkbox" />
      <span>Pause this while I'm on vacation</span>
    </label>

    <div class="buttons">
      <button type="submit" class="btn primary" :disabled="saving">{{ task ? 'Save' : 'Add task' }}</button>
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
.check {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
}
.check input {
  width: 20px;
  height: 20px;
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
