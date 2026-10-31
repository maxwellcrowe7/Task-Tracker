<script setup>
import { ref, computed, watch } from 'vue'
import { state, updateTodo, setTodoDone } from '../data/store.js'
import { deleteTodoWithUndo } from '../lib/quickActions.js'
import { dueLabel, duePill } from '../domain/todos.js'
import Icon from './Icon.vue'
import VisibilityButton from './VisibilityButton.vue'
import TagChip from './TagChip.vue'
import TagPicker from './TagPicker.vue'
import TodoSteps from './TodoSteps.vue'

// Everything about one to-do, edited in place: title, steps, due date, priority, tags, notes.
// Changes save when you leave a field.
const props = defineProps({
  id: { type: String, required: true },
  today: { type: String, required: true },
  closable: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'deleted'])

const todo = computed(() => state.todos.find((t) => t.id === props.id))
const title = ref('')
const notes = ref('')
watch(
  todo,
  (t) => {
    title.value = t?.title ?? ''
    notes.value = t?.notes ?? ''
  },
  { immediate: true },
)

const save = (patch) => updateTodo(todo.value, patch)
function saveTitle() {
  const t = title.value.trim()
  if (!t) title.value = todo.value.title
  else if (t !== todo.value.title) save({ title: t })
}
function saveNotes() {
  const n = notes.value.trim() || null
  if (n !== (todo.value.notes ?? null)) save({ notes: n })
}
const setDue = (value) => save({ due_date: value || null })
// Priority is on or off (stored as 'high', which is what gets the flag).
const flagged = computed(() => todo.value.priority === 'high')
const toggleFlag = () => save({ priority: flagged.value ? null : 'high' })
const due = computed(() => dueLabel(todo.value, props.today))
const pill = computed(() => duePill(todo.value.due_date, props.today))

const tags = computed(() => (todo.value.tag_ids ?? []).map((id) => state.tags.find((t) => t.id === id)).filter(Boolean))
const tagIds = computed({ get: () => todo.value.tag_ids ?? [], set: (ids) => save({ tag_ids: ids }) })
const removeTag = (id) => (tagIds.value = tagIds.value.filter((x) => x !== id))

const toggleDone = () => setTodoDone(todo.value, todo.value.done_on ? null : props.today)
async function remove() {
  await deleteTodoWithUndo(todo.value)
  emit('deleted')
}
</script>

<template>
  <p v-if="!todo" class="missing">That to-do doesn't exist anymore.</p>

  <article v-else class="detail">
    <header class="top">
      <span class="kicker">To-do<template v-if="due"> · <span :class="due.tone">{{ due.text }}</span></template></span>
      <button v-if="closable" class="close" aria-label="Close" @click="emit('close')"><Icon name="close" /></button>
    </header>

    <div class="title-row">
      <button class="check" :class="{ full: todo.done_on }" :aria-label="todo.done_on ? 'Reopen' : 'Check off'" @click="toggleDone">
        <Icon name="check" class="tick" />
      </button>
      <textarea
        v-model="title"
        class="title"
        rows="1"
        aria-label="Title"
        @blur="saveTitle"
        @keydown.enter.prevent="$event.target.blur()"
      ></textarea>
    </div>

    <div class="field">
      <span class="label">Steps</span>
      <TodoSteps :todo="todo" :today="today" />
    </div>

    <div class="extras">
      <label class="pill-btn" :class="{ set: todo.due_date, late: pill.late && !todo.done_on }" title="Due date">
        <Icon name="calendar" class="i" />{{ pill.text }}
        <input type="date" :value="todo.due_date ?? ''" aria-label="Due date" @click="$event.target.showPicker?.()" @change="setDue($event.target.value)" />
        <button v-if="todo.due_date" type="button" class="clear" aria-label="Clear due date" title="Clear due date" @click.prevent.stop="setDue(null)">
          <Icon name="close" />
        </button>
      </label>
      <button type="button" class="pill-btn" :class="{ set: flagged, flagged }" :aria-pressed="flagged" title="Priority" @click="toggleFlag">
        <Icon name="flag" class="i" />Priority
      </button>
      <VisibilityButton
        :lead-days="todo.lead_days ?? null"
        :show-from="todo.show_from ?? null"
        :due-date="todo.due_date"
        :today="today"
        @change="save"
      />
    </div>

    <div class="field">
      <span class="label">Tags</span>
      <span class="tag-row">
        <button v-for="t in tags" :key="t.id" class="chip-x" :title="`Remove ${t.name}`" @click="removeTag(t.id)">
          <TagChip :tag="t" /><span class="x" aria-hidden="true">×</span>
        </button>
        <TagPicker v-model="tagIds" :scope="todo.scope" />
      </span>
    </div>

    <label class="field">
      <span class="label">Notes</span>
      <textarea v-model="notes" class="input notes" rows="4" placeholder="Add notes" @blur="saveNotes"></textarea>
    </label>

    <footer class="foot">
      <span class="muted">{{ todo.done_on ? `Done ${todo.done_on === today ? 'today' : todo.done_on}` : '' }}</span>
      <button class="btn small danger" @click="remove">Delete</button>
    </footer>
  </article>
</template>

<style scoped>
.missing {
  color: var(--muted);
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 32px;
}
.kicker {
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
}
.kicker .late {
  color: var(--late);
}
.kicker .due {
  color: var(--due);
}
.close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--muted);
}
.close:hover {
  background: var(--hover);
}
.close svg {
  width: 16px;
  height: 16px;
}
.title-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 6px 0 18px;
}
.check {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-top: 4px;
  padding: 0;
  border: 1.5px solid var(--faint);
  border-radius: 50%;
  background: none;
  color: #fff;
}
.check.full {
  border-color: var(--accent);
  background: var(--accent);
}
.tick {
  width: 12px;
  height: 12px;
  opacity: 0;
}
.check.full .tick {
  opacity: 1;
}
.title {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
  resize: none;
  field-sizing: content;
  outline: none;
}
/* Due, Priority and Visibility as pills, like the add bar; the pills say what they are.
   The Visibility popup lines up with the row's right edge. */
.extras {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)); /* equal widths, whatever they say */
  gap: 6px;
  margin-bottom: 16px;
}
.extras > .pill-btn,
.extras :deep(.vis > .pill-btn) {
  justify-content: center;
  gap: 4px;
  padding: 0 6px;
  width: 100%;
  min-width: 0;
  white-space: nowrap;
}
.extras :deep(.vis) {
  min-width: 0;
}
/* Keep the icon; if the text doesn't fit, it trails off rather than pushing it out. */
.extras :deep(.pill-btn svg) {
  flex: none;
}
.extras :deep(.vis > .pill-btn > span) {
  overflow: hidden;
  text-overflow: ellipsis;
}
.i {
  width: 13px;
  height: 13px;
}
.pill-btn.late {
  border-color: color-mix(in srgb, var(--late) 40%, transparent);
  background: color-mix(in srgb, var(--late) 12%, transparent);
  color: var(--late);
}
.pill-btn.flagged {
  border-color: color-mix(in srgb, var(--flame) 50%, transparent);
  background: color-mix(in srgb, var(--flame) 12%, transparent);
  color: var(--flame);
}
/* The × sits above the pill's invisible date picker. */
.pill-btn .clear {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  margin-right: -4px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: inherit;
  opacity: 0.7;
  cursor: pointer;
}
.pill-btn .clear:hover {
  opacity: 1;
  background: color-mix(in srgb, currentColor 15%, transparent);
}
.pill-btn .clear svg {
  width: 9px;
  height: 9px;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
/* Tags sit snug; hovering one shows a small × badge on its corner. */
.chip-x {
  position: relative;
  display: inline-flex;
  padding: 0;
  border: 0;
  background: none;
}
.chip-x .x {
  position: absolute;
  top: -6px;
  right: -6px;
  display: none;
  place-items: center;
  width: 15px;
  height: 15px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--raised);
  color: var(--muted);
  font-size: 11px;
  line-height: 1;
}
.chip-x:hover .x,
.chip-x:focus-visible .x {
  display: grid;
  color: var(--late);
}
@media (hover: none) {
  .chip-x .x {
    display: grid;
  }
}
.notes {
  height: auto;
  min-height: 96px;
  padding: 10px 12px;
  line-height: 1.5;
  resize: vertical;
}
.foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.muted {
  font-size: 0.82rem;
  color: var(--muted);
}
</style>
