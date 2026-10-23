<script setup>
import { ref, reactive, computed } from 'vue'
import { state, saveVacation, endVacation } from '../data/store.js'
import { todayLocal } from '../domain/dates.js'
import { currentVacation } from '../domain/pauses.js'
import { formatShortDate } from '../lib/format.js'

// Highlight mode for the task list below, owned by the Manage view.
const highlight = defineModel('highlight', { type: Boolean, default: false })

const today = todayLocal()
const vacation = computed(() => currentVacation(state.vacations, today))
const upcoming = computed(() => vacation.value && vacation.value.start_date > today)

const status = computed(() => {
  const v = vacation.value
  if (!v) return 'Not on vacation.'
  const until = v.end_date ? ` until ${formatShortDate(v.end_date)}` : ' (no end date)'
  return upcoming.value
    ? `Vacation planned from ${formatShortDate(v.start_date)}${until}.`
    : `On vacation since ${formatShortDate(v.start_date)}${until}.`
})

const editing = ref(false)
const form = reactive({ start_date: '', end_date: '' })
const error = ref('')

function startEdit() {
  form.start_date = vacation.value?.start_date ?? today
  form.end_date = vacation.value?.end_date ?? ''
  error.value = ''
  editing.value = true
}

async function save() {
  if (!form.start_date) return (error.value = 'Pick a start date.')
  if (form.end_date && form.end_date < form.start_date) return (error.value = 'End date is before the start date.')
  await saveVacation(vacation.value, { start_date: form.start_date, end_date: form.end_date || null })
  editing.value = false
}

async function end() {
  const msg = upcoming.value ? 'Cancel this vacation?' : 'End vacation now? Today will count as normal.'
  if (confirm(msg)) await endVacation(vacation.value, today)
}

const flaggedCount = computed(() => state.tasks.filter((t) => t.pauses_on_vacation).length)
</script>

<template>
  <section class="panel vacation">
    <div class="top">
      <div>
        <h2>Vacation</h2>
        <p class="status">{{ status }}</p>
      </div>
      <div v-if="!editing" class="actions">
        <button class="btn small" @click="startEdit">{{ vacation ? 'Edit' : 'Set vacation' }}</button>
        <button v-if="vacation" class="btn small" @click="end">{{ upcoming ? 'Cancel' : 'End now' }}</button>
      </div>
    </div>

    <form v-if="editing" class="dates" @submit.prevent="save">
      <label class="field">
        <span class="label">Starts</span>
        <input v-model="form.start_date" type="date" class="input" />
      </label>
      <label class="field">
        <span class="label">Ends (optional)</span>
        <input v-model="form.end_date" type="date" class="input" :min="form.start_date" />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="actions">
        <button type="submit" class="btn small primary">Save</button>
        <button type="button" class="btn small" @click="editing = false">Cancel</button>
      </div>
    </form>

    <label class="highlight">
      <span class="label">Show vacation tasks ({{ flaggedCount }})</span>
      <span class="switch">
        <input v-model="highlight" type="checkbox" />
        <span class="track" aria-hidden="true"></span>
      </span>
    </label>
  </section>
</template>

<style scoped>
.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
h2 {
  margin: 0;
  font-size: 1rem;
}
.status {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: var(--muted);
}
.actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 10px;
  margin-top: 12px;
}
.dates .field {
  margin-bottom: 10px;
}
.dates .error,
.dates .actions {
  grid-column: 1 / -1;
}
.error {
  margin: 0 0 8px;
  font-size: 0.8rem;
  color: #c0392b;
}
.highlight {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  cursor: pointer;
}
.highlight .label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
}
.switch {
  position: relative;
  flex-shrink: 0;
  width: 46px;
  height: 28px;
}
.switch input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}
.switch .track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--track);
  transition: background 0.15s;
}
.switch .track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
  transition: transform 0.15s;
}
.switch input:checked + .track {
  background: var(--vacation);
}
.switch input:checked + .track::after {
  transform: translateX(18px);
}
.switch input:focus-visible + .track {
  outline: 2px solid var(--habit);
  outline-offset: 2px;
}
</style>
