<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { formatShortDate } from '../lib/format.js'
import Icon from './Icon.vue'
import ShowOnToday from './ShowOnToday.vue'

// The "Visibility" pill (eye icon) that opens a small popup for when a to-do shows on
// Today. The pill says what's set ("Shows Nov 6", "3 days before"). The popup hangs off
// the nearest positioned parent, so the parent decides where it lines up.
const props = defineProps({
  leadDays: { type: Number, default: null },
  showFrom: { type: String, default: null },
  dueDate: { type: String, default: null },
  today: { type: String, required: true },
  align: { type: String, default: 'right' }, // which edge of the parent the popup lines up with
  compact: { type: Boolean, default: false }, // phones: icon only until something is set
  emptyText: { type: String, default: 'Visibility' }, // the pill's text when nothing is set
})
const emit = defineEmits(['change'])

const open = ref(false)
const wrap = ref(null)
const isSet = computed(() => Boolean(props.showFrom || (props.leadDays != null && props.dueDate)))
const text = computed(() => {
  if (props.showFrom) return `From ${formatShortDate(props.showFrom)}`
  if (props.leadDays != null && props.dueDate) return `${props.leadDays} day${props.leadDays === 1 ? '' : 's'} before`
  return props.emptyText
})

// Closes when you click anywhere else.
const onDown = (e) => open.value && !wrap.value?.contains(e.target) && (open.value = false)
onMounted(() => document.addEventListener('mousedown', onDown))
onUnmounted(() => document.removeEventListener('mousedown', onDown))
</script>

<template>
  <span ref="wrap" class="vis" @keydown.esc.stop="open = false">
    <button type="button" class="pill-btn" :class="{ set: isSet, open }" :aria-expanded="open" title="When it shows on Today" @click="open = !open">
      <Icon name="eye" class="i" /><span :class="{ lbl: compact && !isSet }">{{ text }}</span>
    </button>
    <div v-if="open" class="pop" :class="align">
      <ShowOnToday :lead-days="leadDays" :show-from="showFrom" :due-date="dueDate" :today="today" @change="emit('change', $event)" />
    </div>
  </span>
</template>

<style scoped>
.i {
  width: 13px;
  height: 13px;
}
/* Open but nothing picked: just a blue border, to tie the menu to its button. */
.pill-btn.open:not(.set) {
  border-color: var(--accent);
}
.pop {
  position: absolute;
  z-index: 20;
  top: calc(100% + 6px);
  width: max-content;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.14);
}
.pop.right {
  right: 0;
}
.pop.left {
  left: 0;
}
@media (max-width: 600px) {
  .lbl {
    display: none;
  }
}
</style>
