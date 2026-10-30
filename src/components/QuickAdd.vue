<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { state, addTodo } from '../data/store.js'
import { quickTags } from '../domain/tags.js'
import { dueLabel, newStep } from '../domain/todos.js'
import { todayLocal } from '../domain/dates.js'
import { context } from '../lib/context.js'
import Icon from './Icon.vue'
import TagChip from './TagChip.vue'
import TagPicker from './TagPicker.vue'
import StepDate from './StepDate.vue'
import ShowOnToday from './ShowOnToday.vue'

// "Brain dump something…": type and press Enter to add a to-do to the current side.
// Clicking in also shows optional extras underneath: due date, notes and tags (favorites
// as one-tap chips), plus a More section for the priority flag, steps, and when it
// shows on Today. On a computer, press N anywhere to jump in.
const props = defineProps({ presetTags: { type: Array, default: () => [] } }) // e.g. the tag you're filtered to
const emit = defineEmits(['added'])
const title = ref('')
const due = ref('')
const flagged = ref(false)
const showRule = ref({ lead_days: null, show_from: null })
const showMore = ref(false)
const notes = ref('')
const tagIds = ref([...props.presetTags])
const showNotes = ref(false)
const steps = ref([]) // { text, due_date }, saved with the to-do
const stepDraft = ref('')
const stepDraftDue = ref(null)
const today = todayLocal()
const showSteps = ref(false)
const stepInput = ref(null)
const focused = ref(false)
const form = ref(null)
const input = ref(null)
const busy = ref(false)

const moreSet = computed(() => flagged.value || steps.value.length > 0 || Boolean(stepDraft.value || showRule.value.show_from || (showRule.value.lead_days != null && due.value)))
const hasExtras = computed(() => Boolean(due.value || moreSet.value || notes.value || steps.value.length || stepDraft.value || stepDraftDue.value || tagIds.value.length > props.presetTags.length))
const expanded = computed(() => focused.value || hasExtras.value || title.value)
const chips = computed(() => quickTags(state.tags, context.scope))
const extraTags = computed(() => state.tags.filter((t) => tagIds.value.includes(t.id) && !chips.value.includes(t)))
const dueText = computed(() => (due.value ? dueLabel({ due_date: due.value }, todayLocal()).text : 'Due'))

const toggleTag = (id) =>
  (tagIds.value = tagIds.value.includes(id) ? tagIds.value.filter((x) => x !== id) : [...tagIds.value, id])

function reset() {
  title.value = due.value = notes.value = stepDraft.value = ''
  flagged.value = false
  showRule.value = { lead_days: null, show_from: null }
  tagIds.value = [...props.presetTags]
  steps.value = []
  stepDraftDue.value = null
  showNotes.value = showSteps.value = showMore.value = false
}

// Enter in the step box adds that step (it doesn't add the to-do); Backspace in an
// empty box pulls the last step back in to edit.
async function toggleSteps() {
  showSteps.value = !showSteps.value
  if (showSteps.value) {
    await nextTick()
    stepInput.value?.focus()
  }
}
function addStep() {
  const text = stepDraft.value.trim()
  if (!text) return
  steps.value.push({ text, due_date: stepDraftDue.value })
  stepDraft.value = ''
  stepDraftDue.value = null
}
function stepBack(e) {
  if (stepDraft.value || !steps.value.length) return
  e.preventDefault()
  const last = steps.value.pop()
  stepDraft.value = last.text
  stepDraftDue.value = last.due_date
}

async function submit() {
  const t = title.value.trim()
  if (!t || busy.value) return
  busy.value = true
  try {
    const saved = await addTodo({
      title: t,
      scope: context.scope,
      due_date: due.value || null,
      priority: flagged.value ? 'high' : null,
      ...(showRule.value.show_from && { show_from: showRule.value.show_from }),
      ...(showRule.value.lead_days != null && due.value && { lead_days: showRule.value.lead_days }),
      notes: notes.value.trim() || null,
      tag_ids: [...tagIds.value],
      steps: [...steps.value, { text: stepDraft.value, due_date: stepDraftDue.value }]
        .filter((st) => st.text.trim())
        .map((st) => ({ ...newStep(st.text.trim()), ...(st.due_date && { due_date: st.due_date }) })),
    })
    reset()
    input.value?.focus()
    emit('added', saved)
  } finally {
    busy.value = false
  }
}

// Stay open while focus is anywhere inside the bar (chips, pickers, notes), including
// the tag list, which floats outside it.
const onFocusOut = (e) => {
  if (!form.value?.contains(e.relatedTarget) && !e.relatedTarget?.closest?.('.tag-picker-pop')) focused.value = false
}

function onKey(e) {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable
  if (e.key.toLowerCase() === 'n' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault()
    input.value?.focus()
  }
}
onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <form ref="form" class="quick" :class="{ expanded }" @submit.prevent="submit" @focusin="focused = true" @focusout="onFocusOut">
    <div class="line">
      <span class="plus" aria-hidden="true"><Icon name="plus" /></span>
      <input
        ref="input"
        v-model="title"
        placeholder="Brain dump something…"
        aria-label="New to-do"
        autocomplete="off"
        enterkeyhint="done"
        @keydown.esc="reset(); input.blur()"
      />
      <kbd v-if="!expanded" class="key">N</kbd>
      <button v-else type="submit" class="add" :disabled="!title.trim() || busy">Add</button>
    </div>

    <div v-if="expanded" class="extras">
      <label class="pill-btn" :class="{ set: due }">
        <Icon name="calendar" class="i" />{{ dueText }}
        <input v-model="due" type="date" aria-label="Due date" @click="$event.target.showPicker?.()" />
      </label>
      <button type="button" class="pill-btn" :class="{ set: showNotes || notes }" @click="showNotes = !showNotes"><Icon name="notes" class="i" />Notes</button>
      <button type="button" class="pill-btn" :class="{ set: showMore || moreSet }" :aria-expanded="showMore" @click="showMore = !showMore">
        <span class="dots" aria-hidden="true">⋯</span>More<span v-if="moreSet && !showMore" class="dot" aria-hidden="true"></span>
      </button>
      <span class="divider" aria-hidden="true"></span>
      <button v-for="t in chips" :key="t.id" type="button" class="chip-btn" :aria-pressed="tagIds.includes(t.id)" @click="toggleTag(t.id)">
        <TagChip :tag="t" :on="tagIds.includes(t.id)" />
      </button>
      <button v-for="t in extraTags" :key="t.id" type="button" class="chip-btn" aria-pressed="true" @click="toggleTag(t.id)">
        <TagChip :tag="t" />
      </button>
      <TagPicker v-model="tagIds" :scope="context.scope" />
    </div>

    <div v-if="expanded && showMore" class="more">
      <div class="more-row">
        <button type="button" class="pill-btn" :class="{ set: flagged, flagged }" :aria-pressed="flagged" @click="flagged = !flagged">
          <Icon name="flag" class="i" />Priority
        </button>
        <button type="button" class="pill-btn" :class="{ set: showSteps || steps.length }" @click="toggleSteps">
          <Icon name="steps" class="i" />{{ steps.length ? `${steps.length} step${steps.length === 1 ? '' : 's'}` : 'Steps' }}
        </button>
      </div>
      <div class="show">
        <span class="show-label">Show on Today</span>
        <ShowOnToday
          :lead-days="showRule.lead_days"
          :show-from="showRule.show_from"
          :due-date="due || null"
          :today="today"
          @change="showRule = { ...showRule, ...$event }"
        />
      </div>
    </div>
    <div v-if="expanded && showSteps" class="steps">
      <div v-for="(s, i) in steps" :key="i" class="step">
        <span class="circle"></span>
        <input v-model="s.text" :aria-label="`Step ${i + 1}`" autocomplete="off" @keydown.enter.prevent="stepInput.focus()" />
        <StepDate v-model="s.due_date" :today="today" :label="`“${s.text}”`" />
        <button type="button" class="del" :aria-label="`Remove “${s.text}”`" @click="steps.splice(i, 1)"><Icon name="close" /></button>
      </div>
      <div class="step">
        <Icon name="plus" class="circle plus" />
        <input
          ref="stepInput"
          v-model="stepDraft"
          placeholder="Add a step, press Enter for the next"
          aria-label="Add a step"
          autocomplete="off"
          @keydown.enter.prevent="addStep"
          @keydown.backspace="stepBack"
        />
        <StepDate v-model="stepDraftDue" :today="today" label="the new step" />
      </div>
    </div>
    <textarea v-if="expanded && showNotes" v-model="notes" class="notes" rows="2" placeholder="Notes"></textarea>
  </form>
</template>

<style scoped>
.quick {
  margin: 18px 0 4px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: var(--raised);
  transition: background 0.15s, border-color 0.15s;
}
.quick.expanded {
  padding-bottom: 10px;
  border-color: var(--border);
  background: var(--surface);
  box-shadow: var(--shadow);
}
.line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.plus {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
}
.plus svg {
  width: 13px;
  height: 13px;
}
.line input {
  flex: 1;
  min-width: 0;
  height: 44px;
  border: 0;
  background: none;
  outline: none;
  font-size: 1rem;
}
.line input::placeholder {
  color: var(--muted);
}
.key {
  padding: 1px 6px;
  border: 1px solid var(--faint);
  border-radius: 5px;
  font: 500 0.7rem Inter, sans-serif;
  color: var(--muted);
}
@media (hover: none) {
  .key {
    display: none;
  }
}
.add {
  height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 7px;
  background: var(--accent);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
}
.extras {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding-left: 32px;
}
.i {
  width: 13px;
  height: 13px;
}
.divider {
  width: 1px;
  height: 18px;
  margin: 0 2px;
  background: var(--border);
}
.chip-btn {
  padding: 0;
  border: 0;
  background: none;
}
.notes {
  display: block;
  width: calc(100% - 32px);
  margin: 8px 0 0 32px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--raised);
  resize: vertical;
  outline: none;
}
.dots {
  font-size: 0.95rem;
  line-height: 1;
}
.dot {
  width: 6px;
  height: 6px;
  margin-left: 2px;
  border-radius: 50%;
  background: var(--accent);
}
.more {
  margin: 10px 0 0 32px;
  padding: 10px 0 2px;
  border-top: 1px solid var(--border);
}
.more-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pill-btn.flagged {
  border-color: color-mix(in srgb, var(--flame) 50%, transparent);
  background: color-mix(in srgb, var(--flame) 12%, transparent);
  color: var(--flame);
}
.show {
  margin-top: 10px;
  max-width: 420px;
}
.show-label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
}
.steps {
  margin: 8px 0 0 32px;
}
.step {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  border-bottom: 1px solid var(--border);
}
.step input {
  flex: 1;
  min-width: 0;
  padding: 5px 0;
  border: 0;
  background: none;
  font-size: 0.9rem;
  outline: none;
}
.circle {
  flex: none;
  width: 15px;
  height: 15px;
  border: 1.5px solid var(--faint);
  border-radius: 50%;
}
.circle.plus {
  border: 0;
  color: var(--faint);
}
.step .del {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--muted);
}
.step .del:hover {
  background: var(--hover);
  color: var(--late);
}
.step .del svg {
  width: 11px;
  height: 11px;
}
@media (max-width: 600px) {
  .steps,
  .more {
    margin-left: 0;
  }
  .extras,
  .notes {
    padding-left: 0;
    margin-left: 0;
    width: 100%;
  }
}
</style>
