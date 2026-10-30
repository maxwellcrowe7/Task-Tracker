<script setup>
import { computed } from 'vue'
import { dueLabel } from '../domain/todos.js'
import { formatShortDate } from '../lib/format.js'
import Icon from './Icon.vue'

// A step's optional due date: a calendar icon until set, then "Fri" / "Today" /
// "Overdue" in color. Hovering the date (not the whole line) shows × to clear it.
const model = defineModel({ type: String, default: null })
const props = defineProps({
  today: { type: String, required: true },
  done: { type: Boolean, default: false },
  label: { type: String, default: 'step' }, // for screen readers
})

const shown = computed(() => {
  if (!model.value) return null
  if (props.done) return { text: formatShortDate(model.value), tone: '' }
  const d = dueLabel({ due_date: model.value }, props.today)
  return { ...d, text: d.text.replace('Overdue · ', 'Overdue ') }
})
</script>

<template>
  <span class="step-date" :class="{ set: model, done }">
    <label class="when" :class="shown?.tone" :title="model ? 'Change due date' : 'Add a due date'">
      <Icon v-if="!model" name="calendar" />
      <template v-else>{{ shown.text }}</template>
      <input
        type="date"
        :value="model ?? ''"
        :aria-label="`Due date for ${label}`"
        @click="$event.target.showPicker?.()"
        @change="model = $event.target.value || null"
      />
    </label>
    <button v-if="model" type="button" class="clear" :aria-label="`Clear due date for ${label}`" @mousedown.prevent @click="model = null">
      <Icon name="close" />
    </button>
  </span>
</template>

<style scoped>
.step-date {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
}
.when {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 0.78rem;
  color: var(--muted);
  white-space: nowrap;
  cursor: pointer;
}
.when:hover {
  background: var(--hover);
}
.when svg {
  width: 13px;
  height: 13px;
}
.when.due {
  color: var(--due);
}
.when.late {
  color: var(--late);
}
.done .when {
  color: var(--faint);
  text-decoration: line-through;
}
.when input {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
}
/* The × floats over the date's corner, only while hovering the date itself. */
.clear {
  position: absolute;
  top: -6px;
  right: -6px;
  display: none;
  place-items: center;
  width: 15px;
  height: 15px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--raised);
  color: var(--muted);
}
.step-date:hover .clear {
  display: grid;
}
.clear:hover {
  color: var(--late);
}
.clear svg {
  width: 8px;
  height: 8px;
}
</style>
