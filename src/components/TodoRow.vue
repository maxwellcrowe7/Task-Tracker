<script setup>
import { ref, computed } from 'vue'
import { state, setTodoDone, deleteTodo, restoreTodo } from '../data/store.js'
import { dueLabel, stepProgress, showsFrom } from '../domain/todos.js'
import { formatShortDate } from '../lib/format.js'
import Icon from './Icon.vue'
import TagChip from './TagChip.vue'
import SwipeRow from './SwipeRow.vue'
import { showToast } from '../lib/toast.js'

// A to-do on a list: the circle checks it off (on `today`), tapping elsewhere selects it.
const props = defineProps({
  todo: { type: Object, required: true },
  today: { type: String, required: true },
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'done'])

const done = computed(() => Boolean(props.todo.done_on))
const due = computed(() => dueLabel(props.todo, props.today))
const steps = computed(() => stepProgress(props.todo))
// Waiting to show on Today (set in its details): "Shows Nov 7".
const waitsUntil = computed(() => {
  const from = !done.value && showsFrom(props.todo)
  return from && from > props.today ? formatShortDate(from) : null
})
const tags = computed(() => (props.todo.tag_ids ?? []).map((id) => state.tags.find((t) => t.id === id)).filter(Boolean))

const busy = ref(false)
async function toggle() {
  if (busy.value) return
  busy.value = true
  try {
    await setTodoDone(props.todo, done.value ? null : props.today)
    if (done.value) emit('done', props.todo.id)
  } finally {
    busy.value = false
  }
}

// Swipe left on a phone to delete, with Undo.
const swipeActions = [{ key: 'delete', label: 'Delete', icon: 'trash', tone: 'red' }]
async function onSwipe() {
  const row = JSON.parse(JSON.stringify(props.todo))
  await deleteTodo(props.todo)
  showToast(`Deleted ${row.title}`, () => restoreTodo(row))
}
</script>

<template>
  <SwipeRow :actions="swipeActions" @action="onSwipe">
    <div class="row" :class="{ done, selected }" @click="emit('select', todo.id)">
      <button class="check" :class="{ full: done }" :aria-label="done ? `Reopen ${todo.title}` : `Check off ${todo.title}`" :disabled="busy" @click.stop="toggle">
        <Icon name="check" class="tick" />
      </button>
      <div class="text">
        <span class="name">{{ todo.title }}</span>
        <span class="meta">
          <span v-if="todo.priority === 'high'" class="flag" title="Priority"><Icon name="flag" /></span>
          <span v-if="due" :class="due.tone">{{ due.text }}</span>
          <span v-if="waitsUntil" class="waits" title="Hidden from Today until then">Shows {{ waitsUntil }}</span>
          <span v-if="steps" class="steps" :class="{ all: steps.done === steps.total }" :title="`${steps.done} of ${steps.total} steps done`">
            <Icon name="steps" />{{ steps.done }}/{{ steps.total }}
          </span>
          <span v-if="todo.notes" class="has-notes" title="Has notes"><Icon name="notes" /></span>
          <TagChip v-for="t in tags" :key="t.id" :tag="t" />
        </span>
      </div>
    </div>
  </SwipeRow>
</template>

<style scoped>
.row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 0 -10px;
  padding: 9px 10px;
  border-radius: 8px;
}
@media (hover: hover) {
  .row:hover {
    background: var(--hover);
  }
}
.row.selected {
  background: var(--selected);
}
.check {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1.5px solid var(--faint);
  border-radius: 50%;
  background: none;
  color: #fff;
  transition: background 0.2s, border-color 0.2s, transform 0.12s;
}
.check:active {
  transform: scale(0.86);
}
.check.full {
  border-color: var(--accent);
  background: var(--accent);
}
.tick {
  width: 12px;
  height: 12px;
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  transition: stroke-dashoffset 0.25s 0.05s;
}
.check.full .tick {
  stroke-dashoffset: 0;
}
.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 12px;
}
.name {
  font-size: 1rem;
  line-height: 1.35;
  transition: color 0.3s;
}
.row.done .name {
  color: var(--muted);
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.82rem;
  color: var(--muted);
}
.meta:empty {
  display: none;
}
.meta > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.meta svg {
  width: 11px;
  height: 11px;
}
.due {
  color: var(--due);
}
.late {
  color: var(--late);
}
.flag {
  color: var(--flame);
}
.steps {
  font-variant-numeric: tabular-nums;
}
.steps.all {
  color: var(--accent);
}
.waits {
  color: var(--faint);
}
.has-notes {
  color: var(--faint);
}
@media (max-width: 899px) {
  .text {
    flex-direction: column;
    gap: 2px;
  }
}
@media (min-width: 900px) {
  .meta {
    margin-left: auto;
  }
}
</style>
