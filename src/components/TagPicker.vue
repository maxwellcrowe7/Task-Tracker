<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { state, addTag } from '../data/store.js'
import { tagTree, nextColor } from '../domain/tags.js'
import TagChip from './TagChip.vue'
import Icon from './Icon.vue'
import ColorGrid from './ColorGrid.vue'

// "+ Tag" button that opens a small list of this side's tags to toggle, with a box
// to find one or create a new one (picking its color) by typing its name.
const model = defineModel({ type: Array, default: () => [] })
const props = defineProps({
  scope: { type: String, required: true },
  label: { type: String, default: 'Tag' }, // the add bar says "More", next to the favorites
})

const open = ref(false)
const query = ref('')
const root = ref(null)
const input = ref(null)
const pop = ref(null)
const btn = ref(null)
// The list floats in a fixed spot from when it opened, so it doesn't slide right as
// chosen tags push the button along, and it never runs off the screen.
const pos = ref({})

const tree = computed(() => tagTree(state.tags, props.scope))
const available = computed(() => tree.value.map((row) => row.tag))
// Indented like the sidebar; flat while searching.
const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? tree.value.filter((row) => row.tag.name.toLowerCase().includes(q)).map((row) => ({ ...row, depth: 0 })) : tree.value
})
const newColor = ref(null)
const canCreate = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q && !available.value.some((t) => t.name.toLowerCase() === q)
})

function toggle(id) {
  model.value = model.value.includes(id) ? model.value.filter((x) => x !== id) : [...model.value, id]
}
async function create() {
  const name = query.value.trim()
  if (!name) return
  const tag = await addTag({ name, color: newColor.value ?? nextColor(state.tags), scope: props.scope })
  model.value = [...model.value, tag.id]
  query.value = ''
  newColor.value = null
}
function onEnter() {
  if (canCreate.value) create()
  else if (matches.value.length === 1) toggle(matches.value[0].tag.id)
}
async function show() {
  open.value = !open.value
  if (open.value) {
    const r = btn.value.getBoundingClientRect()
    const below = window.innerHeight - r.bottom > 300
    pos.value = {
      left: `${Math.max(8, Math.min(r.left, window.innerWidth - 248))}px`,
      ...(below ? { top: `${r.bottom + 6}px` } : { bottom: `${window.innerHeight - r.top + 6}px` }),
    }
    await nextTick()
    input.value?.focus()
  }
}
const onDoc = (e) => {
  if (open.value && !root.value?.contains(e.target) && !pop.value?.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDoc))
onUnmounted(() => document.removeEventListener('mousedown', onDoc))
</script>

<template>
  <span ref="root" class="picker">
    <button ref="btn" type="button" class="pill-btn" :aria-expanded="open" @click="show"><Icon name="tag" class="i" />{{ label }}</button>
    <Teleport to="body">
    <div v-if="open" ref="pop" class="pop tag-picker-pop" :style="pos" @keydown.esc.stop="open = false">
      <input
        ref="input"
        v-model="query"
        class="find"
        placeholder="Find or create a tag"
        aria-label="Find or create a tag"
        autocomplete="off"
        @keydown.enter.prevent.stop="onEnter"
      />
      <div class="options">
        <button v-for="{ tag: t, depth } in matches" :key="t.id" type="button" class="opt" :style="{ paddingLeft: `${6 + depth * 16}px` }" @click="toggle(t.id)">
          <span class="tickbox" :class="{ on: model.includes(t.id) }">✓</span>
          <TagChip :tag="t" />
        </button>
        <div v-if="canCreate" class="new">
          <button type="button" class="opt create" @click="create">Create “{{ query.trim() }}”</button>
          <ColorGrid :model-value="newColor ?? nextColor(state.tags)" @update:model-value="newColor = $event" />
        </div>
        <p v-if="!matches.length && !canCreate" class="none">No tags yet. Type a name to create one.</p>
      </div>
    </div>
    </Teleport>
  </span>
</template>

<style scoped>
.picker {
  position: relative;
}
.i {
  width: 13px;
  height: 13px;
}
.pop {
  position: fixed;
  z-index: 60;
  width: 240px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.16);
}
.find {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--raised);
  outline: none;
}
.options {
  max-height: 220px;
  overflow: auto;
  margin-top: 6px;
}
.opt {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px;
  border: 0;
  border-radius: 6px;
  background: none;
  text-align: left;
}
.opt:hover {
  background: var(--hover);
}
.tickbox {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--faint);
  border-radius: 4px;
  font-size: 10px;
  color: transparent;
}
.tickbox.on {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}
.new .color-grid {
  padding: 2px 6px 6px;
}
.create {
  color: var(--accent);
  font-weight: 500;
}
.none {
  margin: 6px;
  font-size: 0.82rem;
  color: var(--muted);
}
</style>
