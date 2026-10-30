<script setup>
import { computed } from 'vue'
import { showsFrom } from '../domain/todos.js'
import { addDays } from '../domain/dates.js'
import { formatShortDate } from '../lib/format.js'
import Segmented from './Segmented.vue'

// When a to-do shows on Today: right away (default), some days before it's due, or
// from a date. Emits the fields to save: { lead_days, show_from }.
const props = defineProps({
  leadDays: { type: Number, default: null },
  showFrom: { type: String, default: null },
  dueDate: { type: String, default: null },
  today: { type: String, required: true },
})
const emit = defineEmits(['change'])

const mode = computed({
  get: () => (props.showFrom ? 'date' : props.leadDays != null && props.dueDate ? 'before' : 'now'),
  set: (m) => {
    if (m === 'now') emit('change', { lead_days: null, show_from: null })
    else if (m === 'before') emit('change', { lead_days: 3, show_from: null })
    else emit('change', { lead_days: null, show_from: props.dueDate ? addDays(props.dueDate, -3) : addDays(props.today, 7) })
  },
})
const options = computed(() => [
  { value: 'now', label: 'Now' },
  ...(props.dueDate ? [{ value: 'before', label: 'Days before due' }] : []),
  { value: 'date', label: 'From a date' },
])
function setLead(value) {
  const n = Math.round(Number(value))
  if (Number.isFinite(n) && n >= 0 && n <= 365) emit('change', { lead_days: n })
}
const note = computed(() => {
  const from = showsFrom({ lead_days: props.leadDays, show_from: props.showFrom, due_date: props.dueDate })
  return !from || from <= props.today ? 'On Today now.' : `Hidden from Today until ${formatShortDate(from)}.`
})
</script>

<template>
  <div class="show-on-today">
    <Segmented v-model="mode" :options="options" label="Show on Today" />
    <span v-if="mode === 'before'" class="row">
      <input class="input days" type="number" min="0" max="365" inputmode="numeric" :value="leadDays" aria-label="Days before it's due" @change="setLead($event.target.value)" />
      {{ leadDays === 1 ? 'day' : 'days' }} before it's due
    </span>
    <span v-else-if="mode === 'date'" class="row">
      From
      <input
        class="input"
        type="date"
        :value="showFrom"
        aria-label="Show from"
        @click="$event.target.showPicker?.()"
        @change="$event.target.value && emit('change', { show_from: $event.target.value })"
      />
    </span>
    <span class="hint">{{ note }}</span>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 0.9rem;
}
.days {
  width: 72px;
}
.hint {
  display: block;
  margin-top: 6px;
  font-size: 0.8rem;
  color: var(--muted);
}
</style>
