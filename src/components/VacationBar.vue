<script setup>
import { ref, reactive, computed } from 'vue'
import { state, saveVacation, endVacation } from '../data/store.js'
import { todayLocal } from '../domain/dates.js'
import { currentVacation } from '../domain/pauses.js'
import { formatShortDate } from '../lib/format.js'
import PlaneIcon from './PlaneIcon.vue'
import Icon from './Icon.vue'

// Vacation mode: takes the search bar's place (same height, so the list doesn't move)
// while the list highlights the routines that pause on vacation. Start a vacation now,
// schedule one, or change / end the one that's set. The plane button (or Esc) leaves.
const emit = defineEmits(['done'])

const today = todayLocal()
const vacation = computed(() => currentVacation(state.vacations, today))
const upcoming = computed(() => vacation.value && vacation.value.start_date > today)
const status = computed(() => {
  const v = vacation.value
  if (!v) return 'Vacation'
  // Kept short so the bar can stay narrow (the plane says it's a vacation):
  // "Nov 20 – Nov 27" / "From Nov 20" when it's coming up, "Away until Nov 27" / "Away" now.
  if (upcoming.value) return v.end_date ? `${formatShortDate(v.start_date)} – ${formatShortDate(v.end_date)}` : `From ${formatShortDate(v.start_date)}`
  return v.end_date ? `Away until ${formatShortDate(v.end_date)}` : 'Away'
})

// Scheduling (or changing the dates): two date pills right in the bar.
const editing = ref(false)
const form = reactive({ start_date: '', end_date: '' })
function startEdit() {
  form.start_date = vacation.value?.start_date ?? today
  form.end_date = vacation.value?.end_date ?? ''
  editing.value = true
}
const valid = computed(() => form.start_date && (!form.end_date || form.end_date >= form.start_date))
async function save() {
  if (!valid.value) return
  await saveVacation(vacation.value, { start_date: form.start_date, end_date: form.end_date || null })
  editing.value = false
}
const startNow = () => saveVacation(null, { start_date: today, end_date: null })
async function end() {
  const msg = upcoming.value ? 'Cancel this vacation?' : 'End vacation now? Today will count as normal.'
  if (confirm(msg)) await endVacation(vacation.value, today)
}
</script>

<template>
  <!-- Always the same layout: what's set on the left, its buttons on the right. -->
  <div class="vac-bar" @keydown.esc="emit('done')">
    <PlaneIcon class="plane-i" />
    <template v-if="editing">
      <span class="dates">
        <label class="date-pill" title="Starts">
          {{ form.start_date ? formatShortDate(form.start_date) : 'Start' }}
          <input v-model="form.start_date" type="date" aria-label="Vacation starts" @click="$event.target.showPicker?.()" />
        </label>
        <span class="dash">–</span>
        <label class="date-pill" :class="{ empty: !form.end_date }" title="Ends (optional)">
          {{ form.end_date ? formatShortDate(form.end_date) : 'No end' }}
          <input v-model="form.end_date" type="date" :min="form.start_date" aria-label="Vacation ends (optional)" @click="$event.target.showPicker?.()" />
        </label>
      </span>
      <span class="actions">
        <button class="btn small primary icon" :disabled="!valid" aria-label="Save" title="Save" @click="save"><Icon name="check" class="ic-check" /></button>
        <button class="btn small icon" aria-label="Cancel" title="Cancel" @click="editing = false"><Icon name="close" class="ic-close" /></button>
      </span>
    </template>
    <template v-else>
      <span class="status">{{ status }}</span>
      <span class="actions">
        <template v-if="!vacation">
          <button class="btn small" title="Start a vacation today" @click="startNow">Start</button>
          <button class="btn small" title="Pick vacation dates" @click="startEdit">Schedule</button>
        </template>
        <template v-else>
          <button class="btn small" @click="startEdit">Edit</button>
          <button class="btn small" @click="end">{{ upcoming ? 'Cancel' : 'End' }}</button>
        </template>
      </span>
    </template>
  </div>
</template>

<style scoped>
.vac-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  height: 40px; /* the search bar's height, so swapping them moves nothing */
  padding: 0 5px 0 12px;
  border: 1px solid var(--vacation);
  border-radius: 10px;
  background: var(--surface);
  font-size: 0.9rem;
  white-space: nowrap;
}
/* In the header (computers): one fixed width, whatever it's showing. It's the width of
   the widest state ("Nov 20 – Nov 27 · Edit · Cancel"), so nothing needs more. */
.vac-bar.in-head {
  width: 290px;
}
.plane-i {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--vacation);
}
.status {
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--vacation);
  font-weight: 600;
}
.actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.btn.small {
  height: 28px;
  min-height: 28px;
  padding: 0 10px;
}
.btn.icon {
  display: grid;
  place-items: center;
  width: 28px;
  padding: 0;
}
.btn.icon svg {
  width: 12px;
  height: 12px;
}
/* The two icons are drawn at different scales; even them out to about 2px lines. */
.ic-check {
  stroke-width: 2.2;
}
.ic-close {
  width: 11px;
  height: 11px;
  stroke-width: 3.8;
}
/* Dates look like the buttons beside them, with the native picker laid invisibly over each. */
.dates {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dash {
  color: var(--muted);
}
.date-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.date-pill.empty {
  color: var(--muted);
  font-weight: 500;
}
.date-pill input {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
}
</style>