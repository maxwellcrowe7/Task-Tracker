<script setup>
import { computed } from 'vue'
import { addDays } from '../domain/dates.js'
import { formatShortDate } from '../lib/format.js'
import Icon from './Icon.vue'

// Holding a to-do back from Today: some days before it's due, or from a date. Without
// either it shows right away (the default), so that isn't a line of its own: clicking
// the checked line again turns it off. The number and date sit inside their line as
// soft chips. Emits the fields to save: { lead_days, show_from }.
const props = defineProps({
  leadDays: { type: Number, default: null },
  showFrom: { type: String, default: null },
  dueDate: { type: String, default: null },
  today: { type: String, required: true },
})
const emit = defineEmits(['change'])

const mode = computed(() => (props.showFrom ? 'date' : props.leadDays != null && props.dueDate ? 'before' : 'now'))
function pick(m) {
  if (m === mode.value) return
  if (m === 'before') props.dueDate && emit('change', { lead_days: 3, show_from: null })
  else emit('change', { lead_days: null, show_from: props.dueDate ? addDays(props.dueDate, -3) : addDays(props.today, 7) })
}
// Clicking a line picks it, or turns it off if it's already on. Clicks inside its chip
// only pick it (you're editing the number or date).
function onLine(m, event) {
  if (event.target.closest?.('.box')) return pick(m)
  if (m === mode.value) emit('change', { lead_days: null, show_from: null })
  else pick(m)
}
function setLead(value) {
  const n = Math.round(Number(value))
  if (Number.isFinite(n) && n >= 0 && n <= 365) emit('change', { lead_days: n, show_from: null })
}
function setFrom(value) {
  if (value) emit('change', { lead_days: null, show_from: value })
}
// The box shows 3 until you pick this line, so it's clear what you'd get.
const leadShown = computed(() => (mode.value === 'before' ? props.leadDays : 3))
const fromShown = computed(() => (props.showFrom ? formatShortDate(props.showFrom) : 'a date'))
</script>

<template>
  <div class="show-on-today" role="group" aria-label="Visibility">
    <div
      class="opt"
      :class="{ on: mode === 'before', off: !dueDate }"
      role="checkbox"
      :aria-checked="mode === 'before'"
      :aria-disabled="!dueDate"
      :title="dueDate ? null : 'Set a due date first'"
      tabindex="0"
      @click="onLine('before', $event)"
      @keydown.enter.space.self.prevent="onLine('before', $event)"
    >
      <input
        class="box days"
        type="number"
        min="0"
        max="365"
        inputmode="numeric"
        :value="leadShown"
        :disabled="!dueDate"
        aria-label="Days before it's due"
        @focus="pick('before')"
        @change="setLead($event.target.value)"
      />
      {{ leadShown === 1 ? 'day' : 'days' }} before due
      <Icon v-if="mode === 'before'" name="check" class="tick" />
    </div>
    <div
      class="opt"
      :class="{ on: mode === 'date' }"
      role="checkbox"
      :aria-checked="mode === 'date'"
      tabindex="0"
      @click="onLine('date', $event)"
      @keydown.enter.space.self.prevent="onLine('date', $event)"
    >
      From
      <label class="box date">
        {{ fromShown }}
        <input
          type="date"
          :value="showFrom ?? ''"
          aria-label="Show from"
          @click="pick('date'); $event.target.showPicker?.()"
          @change="setFrom($event.target.value)"
        />
      </label>
      <Icon v-if="mode === 'date'" name="check" class="tick" />
    </div>
  </div>
</template>

<style scoped>
.show-on-today {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.opt {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 200px;
  min-height: 34px;
  padding: 0 10px;
  border-radius: 7px;
  font-size: 0.88rem;
  white-space: nowrap;
  cursor: pointer;
}
.opt:hover {
  background: var(--hover);
}
.opt.off {
  color: var(--faint);
  cursor: default;
}
.opt.off:hover {
  background: none;
}
.opt.on {
  color: var(--accent);
  font-weight: 500;
}
.tick {
  width: 12px;
  height: 12px;
  margin-left: auto;
  padding-left: 12px;
  box-sizing: content-box;
}
/* The number and date: soft chips rather than boxed fields. */
.box {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 7px;
  border: 0;
  border-radius: 6px;
  background: var(--raised);
  color: var(--text);
  font: inherit;
  font-weight: 500;
  outline: none;
}
.opt.on .box {
  background: var(--accent-soft);
  color: var(--accent);
}
.box:focus-visible {
  box-shadow: 0 0 0 2px var(--accent);
}
.box:disabled {
  background: none;
  color: var(--faint);
}
/* A transparent native date picker laid over the chip. */
.date input {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
}
.days {
  width: 34px;
  padding: 0;
  text-align: center;
  -moz-appearance: textfield;
}
.days::-webkit-inner-spin-button,
.days::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
