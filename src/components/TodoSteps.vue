<script setup>
import { ref, watch, nextTick } from 'vue'
import { updateTodo, setTodoDone } from '../data/store.js'
import { newStep, allStepsDone } from '../domain/todos.js'
import Icon from './Icon.vue'
import StepDate from './StepDate.vue'

// The checklist inside a to-do. Type a step and press Enter to add the next one;
// Backspace on an empty step removes it; drag the grip to reorder. Each step can have
// its own due date. Checking the last one offers to check off the whole to-do.
const props = defineProps({
  todo: { type: Object, required: true },
  today: { type: String, required: true },
})

// A working copy, so a blank step can exist while you type into it.
const list = ref([])
watch(
  () => props.todo.id,
  () => (list.value = (props.todo.steps ?? []).map((s) => ({ ...s }))),
  { immediate: true },
)
const draft = ref('')
const inputs = ref([])
const adder = ref(null)

function persist() {
  const steps = list.value.filter((s) => s.text.trim()).map((s) => ({ ...s, text: s.text.trim() }))
  if (JSON.stringify(steps) !== JSON.stringify(props.todo.steps ?? [])) updateTodo(props.todo, { steps })
}
async function focusAt(i) {
  await nextTick()
  const el = inputs.value[i]
  if (el) {
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  } else adder.value?.focus()
}

const offerFinish = ref(false)
function toggle(step) {
  step.done = !step.done
  persist()
  offerFinish.value = step.done && !props.todo.done_on && allStepsDone({ steps: list.value.filter((x) => x.text.trim()) })
}
async function finish() {
  offerFinish.value = false
  await setTodoDone(props.todo, props.today)
}
watch(
  () => props.todo.id,
  () => (offerFinish.value = false),
)

function setDue(step, value) {
  if (value) step.due_date = value
  else delete step.due_date
  persist()
}
function add() {
  const text = draft.value.trim()
  if (!text) return
  list.value.push(newStep(text))
  draft.value = ''
  persist()
}
// Enter splits off a new step below; Backspace on an empty one deletes it.
function onEnter(i) {
  list.value.splice(i + 1, 0, newStep(''))
  persist()
  focusAt(i + 1)
}
function onBackspace(i, event) {
  if (list.value[i].text) return
  event.preventDefault()
  list.value.splice(i, 1)
  persist()
  focusAt(Math.max(0, i - 1))
}
function remove(i) {
  list.value.splice(i, 1)
  persist()
}
function onBlur(i) {
  if (!list.value[i]?.text.trim()) list.value.splice(i, 1)
  persist()
}

// Drag the grip: the line shows whether it lands above or below the step under it.
const dragFrom = ref(null)
const dropAt = ref(null) // { i, after }
function dragStart(i, event) {
  dragFrom.value = i
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', list.value[i].text)
  event.dataTransfer.setDragImage(event.currentTarget.closest('.step'), 12, 14)
}
function dragOver(i, event) {
  if (dragFrom.value === null) return
  event.preventDefault()
  const box = event.currentTarget.getBoundingClientRect()
  dropAt.value = { i, after: event.clientY > box.top + box.height / 2 }
}
function drop() {
  const from = dragFrom.value
  const at = dropAt.value
  dragEnd()
  if (from === null || !at) return
  let to = at.i + (at.after ? 1 : 0)
  if (from < to) to--
  if (to === from) return
  const [step] = list.value.splice(from, 1)
  list.value.splice(to, 0, step)
  persist()
}
function dragEnd() {
  dragFrom.value = null
  dropAt.value = null
}
</script>

<template>
  <div class="steps">
    <div
      v-for="(s, i) in list"
      :key="s.id"
      class="step"
      :class="{ done: s.done, lifted: dragFrom === i, 'drop-before': dropAt?.i === i && !dropAt.after, 'drop-after': dropAt?.i === i && dropAt.after }"
      @dragover="dragOver(i, $event)"
      @drop.prevent="drop"
    >
      <span class="grip" draggable="true" title="Drag to reorder" @dragstart="dragStart(i, $event)" @dragend="dragEnd">⋮⋮</span>
      <button class="box" :class="{ on: s.done }" :aria-label="s.done ? `Mark “${s.text}” not done` : `Mark “${s.text}” done`" @click="toggle(s)">
        <Icon name="check" />
      </button>
      <input
        :ref="(el) => (inputs[i] = el)"
        v-model="s.text"
        class="text"
        :aria-label="`Step ${i + 1}`"
        autocomplete="off"
        @keydown.enter.prevent="onEnter(i)"
        @keydown.backspace="onBackspace(i, $event)"
        @blur="onBlur(i)"
      />
      <StepDate :model-value="s.due_date ?? null" :today="today" :done="s.done" :label="`“${s.text}”`" @update:model-value="setDue(s, $event)" />
      <button class="del" :aria-label="`Remove “${s.text}”`" @mousedown.prevent @click="remove(i)"><Icon name="close" /></button>
    </div>
    <p v-if="offerFinish" class="finish">
      All steps done. Check off the to-do?
      <button class="btn small primary" @click="finish">Check it off</button>
      <button class="link" @click="offerFinish = false">Not now</button>
    </p>
    <div class="step add">
      <Icon name="plus" class="plus" />
      <input
        ref="adder"
        v-model="draft"
        class="text"
        placeholder="Add a step"
        aria-label="Add a step"
        autocomplete="off"
        @keydown.enter.prevent="add"
        @blur="add"
      />
    </div>
  </div>
</template>

<style scoped>
.step {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  border-bottom: 1px solid var(--border);
}
.step.lifted {
  opacity: 0.4;
}
.grip {
  position: absolute;
  left: -18px;
  width: 14px;
  color: var(--faint);
  font-size: 0.7rem;
  letter-spacing: -2px;
  text-align: center;
  cursor: grab;
  opacity: 0;
}
.step:hover .grip {
  opacity: 1;
}
.box {
  flex: none;
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  padding: 0;
  border: 1.5px solid var(--faint);
  border-radius: 50%;
  background: none;
  color: #fff;
}
.box svg {
  width: 9px;
  height: 9px;
  opacity: 0;
}
.box.on {
  border-color: var(--accent);
  background: var(--accent);
}
.box.on svg {
  opacity: 1;
}
.text {
  flex: 1;
  min-width: 0;
  padding: 6px 0;
  border: 0;
  background: none;
  font-size: 0.92rem;
  outline: none;
}
.done .text {
  color: var(--muted);
  text-decoration: line-through;
  text-decoration-color: var(--faint);
}
.plus {
  flex: none;
  width: 17px;
  height: 13px;
  color: var(--faint);
}
.add .text::placeholder {
  color: var(--muted);
}
.del {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--muted);
  opacity: 0;
}
.step:hover .del,
.step:focus-within .del {
  opacity: 1;
}
.del:hover {
  background: var(--hover);
  color: var(--late);
}
.del svg {
  width: 12px;
  height: 12px;
}
.step-date:not(.set) {
  opacity: 0;
}
.step:hover .step-date,
.step:focus-within .step-date {
  opacity: 1;
}
.finish {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 8px 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--accent-soft);
  font-size: 0.85rem;
}
.finish .link {
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 0.85rem;
}
.step.drop-before::before,
.step.drop-after::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
  pointer-events: none;
}
.step.drop-before::before {
  top: -1px;
}
.step.drop-after::after {
  bottom: -1px;
}
@media (hover: none) {
  .del {
    opacity: 1;
  }
}
</style>
