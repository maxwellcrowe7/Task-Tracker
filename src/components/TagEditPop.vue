<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { state, updateTag, deleteTag } from '../data/store.js'
import { parentChoices, favoritesFull, FAV_CAP } from '../domain/tags.js'
import { context } from '../lib/context.js'
import ColorGrid from './ColorGrid.vue'

// The little box for renaming, recoloring, nesting or deleting a tag. It floats next
// to whatever opened it (`anchor`), so it isn't clipped by the scrolling sidebar.
const props = defineProps({
  tag: { type: Object, required: true },
  anchor: { type: Object, required: true }, // the element it opens from
  side: { type: String, default: 'below' }, // or 'right'
})
const emit = defineEmits(['close', 'deleted'])

const name = ref(props.tag.name)
const pop = ref(null)
const nameInput = ref(null)

const r = props.anchor.getBoundingClientRect()
const pos =
  props.side === 'right'
    ? { top: `${Math.min(r.top - 6, window.innerHeight - 470)}px`, left: `${r.right + 8}px` }
    : { top: `${r.bottom + 6}px`, left: `${r.left}px` }

const color = computed({ get: () => props.tag.color, set: (c) => updateTag(props.tag, { color: c }) })
const parents = computed(() => parentChoices(state.tags, context.scope, props.tag.id))
const setParent = (id) => updateTag(props.tag, { parent_id: id || null })
const favFull = computed(() => !props.tag.fav && favoritesFull(state.tags, props.tag).length > 0)
const toggleFav = () => favFull.value || updateTag(props.tag, { fav: !props.tag.fav })

function saveName() {
  const n = name.value.trim()
  if (n && n !== props.tag.name) updateTag(props.tag, { name: n })
}
function close() {
  saveName()
  emit('close')
}
async function remove() {
  const used = state.todos.filter((t) => t.tag_ids?.includes(props.tag.id)).length
  const msg = used ? `Delete "${props.tag.name}"? It will be removed from ${used} to-do${used === 1 ? '' : 's'}.` : `Delete "${props.tag.name}"?`
  if (!confirm(msg)) return
  await deleteTag(props.tag)
  emit('deleted')
}

// Clicking anywhere else closes it (the anchor handles its own clicks).
const onDown = (e) => {
  if (!pop.value?.contains(e.target) && !props.anchor.contains(e.target)) close()
}
onMounted(() => {
  document.addEventListener('mousedown', onDown)
  nameInput.value?.select()
})
onUnmounted(() => document.removeEventListener('mousedown', onDown))
defineExpose({ close })
</script>

<template>
  <Teleport to="body">
    <div ref="pop" class="tag-pop" :style="pos" @keydown.esc.stop="close">
      <label class="label" :for="`tag-name-${tag.id}`">Name</label>
      <div class="name-row">
        <input :id="`tag-name-${tag.id}`" ref="nameInput" v-model="name" class="input" autocomplete="off" @keydown.enter.prevent="close" />
        <button
          class="fav"
          :class="{ on: tag.fav }"
          :disabled="favFull"
          :title="favFull ? `You already have ${FAV_CAP} favorites. Unstar one first.` : tag.fav ? 'Favorite (click to unstar)' : 'Star as a favorite: shows as a one-tap chip when adding a to-do'"
          :aria-label="tag.fav ? 'Unstar' : 'Star as a favorite'"
          @click="toggleFav"
        >
          {{ tag.fav ? '★' : '☆' }}
        </button>
      </div>
      <span class="label">Color</span>
      <ColorGrid v-model="color" />
      <label class="label" :for="`tag-parent-${tag.id}`">Inside</label>
      <select :id="`tag-parent-${tag.id}`" class="input" :value="tag.parent_id ?? ''" @change="setParent($event.target.value)">
        <option value=""></option>
        <option v-for="p in parents" :key="p.tag.id" :value="p.tag.id">{{ '   '.repeat(p.depth) + p.tag.name }}</option>
      </select>
      <button class="del" @click="remove">Delete tag</button>
    </div>
  </Teleport>
</template>

<style scoped>
.tag-pop {
  position: fixed;
  z-index: 60;
  width: 248px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--raised);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.14);
  font-size: 0.9rem;
}
.label {
  display: block;
  margin: 0 0 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
}
.color-grid + .label {
  margin-top: 10px;
}
.input {
  width: 100%;
  margin-bottom: 10px;
}
select.input {
  margin-bottom: 0;
}
.name-row {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}
.name-row .input {
  flex: 1;
  margin-bottom: 0;
}
.fav {
  flex: none;
  width: 34px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--faint);
  font-size: 1.25rem;
}
.fav:hover:not(:disabled) {
  background: var(--hover);
}
.fav:disabled {
  opacity: 0.4;
}
.fav.on {
  color: var(--star);
}
.del {
  display: block;
  margin-top: 10px;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--late);
  font-size: 0.82rem;
}
.del:hover {
  text-decoration: underline;
}
</style>
