<script setup>
import { ref, computed, watch } from 'vue'
import { state, updateTodo, setTodoDone } from '../data/store.js'
import { deleteTodoWithUndo } from '../lib/quickActions.js'
import { dueLabel } from '../domain/todos.js'
import Icon from './Icon.vue'
import ShowOnToday from './ShowOnToday.vue'
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

    <label class="field">
      <span class="label">Due</span>
      <span class="due-row">
        <input class="input" type="date" :value="todo.due_date ?? ''" @change="setDue($event.target.value)" />
        <button v-if="todo.due_date" class="btn small" @click="setDue(null)">Clear</button>
      </span>
    </label>

    <div class="field">
      <span class="label">Visibility</span>
      <ShowOnToday :lead-days="todo.lead_days ?? null" :show-from="todo.show_from ?? null" :due-date="todo.due_date" :today="today" @change="save" />
    </div>

    <div class="field">
      <span class="label">Priority</span>
      <button class="flag-btn" :class="{ on: flagged }" :aria-pressed="flagged" @click="toggleFlag">
        <Icon name="flag" />{{ flagged ? 'Priority' : 'Not a priority' }}
      </button>
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
.due-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.flag-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: none;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 500;
}
.flag-btn svg {
  width: 12px;
  height: 12px;
}
.flag-btn:hover {
  background: var(--hover);
}
.flag-btn.on {
  border-color: color-mix(in srgb, var(--flame) 50%, transparent);
  background: color-mix(in srgb, var(--flame) 12%, transparent);
  color: var(--flame);
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
