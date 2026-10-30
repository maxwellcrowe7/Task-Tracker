<script setup>
import { ref, computed } from 'vue'
import { state, addTag, updateTag, deleteTag } from '../data/store.js'
import { FAV_CAP, favoritesFull, tagTree, parentChoices, nextColor, paletteColor } from '../domain/tags.js'
import { context } from '../lib/context.js'
import ColorGrid from './ColorGrid.vue'

// Settings → Tags: rename, recolor, nest, choose which side a tag belongs to, star
// favorites (shown as one-tap chips in the Brain dump bar), delete, and add new ones.
const rows = computed(() => tagTree(state.tags, context.scope))
const recoloring = ref(null) // tag whose color/Inside options are open
const newName = ref('')
const newColor = ref(null)
const newColorOpen = ref(false)
const style = (color) => ({ '--tag-bg': paletteColor(color).bg, '--tag-fg': paletteColor(color).fg })

function rename(tag, event) {
  const name = event.target.value.trim()
  if (!name) event.target.value = tag.name
  else if (name !== tag.name) updateTag(tag, { name })
}

// Favorites are capped per side so the add-bar chips fit on one line.
function toggleFav(tag) {
  if (!tag.fav) {
    const full = favoritesFull(state.tags, tag)
    if (full.length) {
      alert(`You can star up to ${FAV_CAP} tags per side. Unstar another ${full.join('/')} tag first.`)
      return
    }
  }
  updateTag(tag, { fav: !tag.fav })
}

async function remove(tag) {
  const used = state.todos.filter((t) => t.tag_ids?.includes(tag.id)).length
  const msg = used ? `Delete "${tag.name}"? It will be removed from ${used} to-do${used === 1 ? '' : 's'}.` : `Delete "${tag.name}"?`
  if (confirm(msg)) await deleteTag(tag)
}

async function create() {
  const name = newName.value.trim()
  if (!name) return
  await addTag({ name, color: newColor.value ?? nextColor(state.tags), scope: context.scope })
  newName.value = ''
  newColor.value = null
  newColorOpen.value = false
}
</script>

<template>
  <div class="tags">
    <div v-for="{ tag: t, depth } in rows" :key="t.id" class="tag-row" :style="{ '--depth': depth }">
      <button class="dot" :style="style(t.color)" :aria-label="`Change color of ${t.name}`" @click="recoloring = recoloring === t.id ? null : t.id"></button>
      <input class="name" :value="t.name" :aria-label="`Name of ${t.name}`" @blur="rename(t, $event)" @keydown.enter="$event.target.blur()" />
      <select class="scope" :value="t.scope" aria-label="Which side" @change="updateTag(t, { scope: $event.target.value })">
        <option value="personal">Personal</option>
        <option value="work">Work</option>
        <option value="both">Both</option>
      </select>
      <button class="star" :class="{ on: t.fav }" :title="t.fav ? 'Favorite: shown in the Brain dump bar' : 'Star to show in the Brain dump bar'" @click="toggleFav(t)">
        {{ t.fav ? '★' : '☆' }}
      </button>
      <button class="del" :aria-label="`Delete ${t.name}`" @click="remove(t)">×</button>
      <div v-if="recoloring === t.id" class="more">
        <ColorGrid :model-value="t.color" @update:model-value="updateTag(t, { color: $event })" />
        <label class="inside">
          Inside
          <select :value="t.parent_id ?? ''" @change="updateTag(t, { parent_id: $event.target.value || null })">
            <option value="">Nothing (top level)</option>
            <option v-for="p in parentChoices(state.tags, context.scope, t.id)" :key="p.tag.id" :value="p.tag.id">
              {{ '\u00a0\u00a0\u00a0'.repeat(p.depth) + p.tag.name }}
            </option>
          </select>
        </label>
      </div>
    </div>
    <p v-if="!rows.length" class="none">No tags on this side yet.</p>
    <form class="add" @submit.prevent="create">
      <button
        type="button"
        class="dot big"
        :style="style(newColor ?? nextColor(state.tags))"
        aria-label="Color for the new tag"
        @click="newColorOpen = !newColorOpen"
      ></button>
      <input v-model="newName" class="input" placeholder="New tag name" aria-label="New tag name" autocomplete="off" />
      <button class="btn" :disabled="!newName.trim()">Add tag</button>
    </form>
    <ColorGrid v-if="newColorOpen" class="new-colors" :model-value="newColor ?? nextColor(state.tags)" @update:model-value="newColor = $event" />
    <p class="note">
      Showing tags for {{ context.scope === 'work' ? 'Work' : 'Personal' }} (plus any shared by both). Starred tags appear as one-tap chips
      when you add a to-do. Click a tag's color square to recolor it or put it inside another tag.
    </p>
  </div>
</template>

<style scoped>
.tag-row {
  display: grid;
  grid-template-columns: auto 1fr auto 28px 28px;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
}
.dot {
  width: 14px;
  height: 14px;
  margin-left: calc(var(--depth, 0) * 18px);
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--tag-fg) 35%, transparent);
  border-radius: 4px;
  background: var(--tag-bg);
}
.dot.big {
  flex: none;
  width: 20px;
  height: 20px;
  align-self: center;
}
:root[data-theme='dark'] .dot {
  border-color: transparent;
  background: color-mix(in srgb, var(--tag-fg) 55%, #1c1c1e);
}
.name {
  min-width: 0;
  height: 32px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: none;
}
.name:hover,
.name:focus {
  border-color: var(--border);
  outline: none;
}
.scope {
  height: 30px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  font-size: 0.82rem;
}
.star,
.del {
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--faint);
  font-size: 1.05rem;
}
.star.on {
  color: var(--star);
}
.star:hover,
.del:hover {
  background: var(--hover);
}
.del:hover {
  color: var(--late);
}
.more {
  grid-column: 2 / -1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 260px;
  padding: 4px 0 10px;
}
.inside {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--muted);
}
.inside select {
  flex: 1;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  font-size: 0.82rem;
}
.new-colors {
  max-width: 260px;
  margin-top: 10px;
}
.none {
  color: var(--muted);
  font-size: 0.85rem;
}
.add {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.add .btn {
  flex: none;
  white-space: nowrap;
}
.note {
  margin: 8px 0 0;
  font-size: 0.78rem;
  color: var(--muted);
}
</style>
