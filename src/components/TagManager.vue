<script setup>
import { ref, computed } from 'vue'
import { state, addTag, updateTag, deleteTag } from '../data/store.js'
import { FAV_CAP, favoritesFull, tagTree, parentChoices, nextColor, paletteColor } from '../domain/tags.js'
import { context } from '../lib/context.js'
import ColorGrid from './ColorGrid.vue'

// Every tag on one screen (Settings, and "Edit tags" in the sidebar): rename, recolor,
// nest, choose which side it belongs to, star favorites (one-tap chips in the Brain
// dump bar), delete, and add new ones.
const rows = computed(() => tagTree(state.tags, context.scope))
const recoloring = ref(null) // tag whose color grid is open
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
const favFull = (tag) => !tag.fav && favoritesFull(state.tags, tag).length > 0
const toggleFav = (tag) => favFull(tag) || updateTag(tag, { fav: !tag.fav })

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
    <div v-if="rows.length" class="tag-row head" aria-hidden="true">
      <span></span><span>Name</span><span>Inside</span><span>Side</span><span class="c">Fav</span><span></span>
    </div>
    <template v-for="{ tag: t, depth } in rows" :key="t.id">
      <div class="tag-row">
        <button class="dot" :style="style(t.color)" :aria-label="`Change color of ${t.name}`" :aria-expanded="recoloring === t.id" @click="recoloring = recoloring === t.id ? null : t.id"></button>
        <input class="name" :style="{ '--depth': depth }" :value="t.name" :aria-label="`Name of ${t.name}`" @blur="rename(t, $event)" @keydown.enter="$event.target.blur()" />
        <select class="pick inside" :value="t.parent_id ?? ''" :aria-label="`What ${t.name} is inside`" @change="updateTag(t, { parent_id: $event.target.value || null })">
          <option value=""></option>
          <option v-for="p in parentChoices(state.tags, context.scope, t.id)" :key="p.tag.id" :value="p.tag.id">
            {{ '\u00a0\u00a0\u00a0'.repeat(p.depth) + p.tag.name }}
          </option>
        </select>
        <select class="pick side" :value="t.scope" :aria-label="`Which side ${t.name} is on`" @change="updateTag(t, { scope: $event.target.value })">
          <option value="personal">Personal</option>
          <option value="work">Work</option>
          <option value="both">Both</option>
        </select>
        <button
          class="star"
          :class="{ on: t.fav }"
          :disabled="favFull(t)"
          :title="favFull(t) ? `You already have ${FAV_CAP} favorites. Unstar one first.` : t.fav ? 'Unstar' : 'Star as a favorite'"
          :aria-label="t.fav ? `Unstar ${t.name}` : `Star ${t.name}`"
          @click="toggleFav(t)"
        >
          {{ t.fav ? '★' : '☆' }}
        </button>
        <button class="del" title="Delete" :aria-label="`Delete ${t.name}`" @click="remove(t)">×</button>
      </div>
      <ColorGrid v-if="recoloring === t.id" class="colors" :model-value="t.color" @update:model-value="updateTag(t, { color: $event })" />
    </template>
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
      Showing {{ context.scope === 'work' ? 'Work' : 'Personal' }} tags (plus any on both sides). Click a color square to change it. Starred tags
      show as one-tap chips when you add a to-do.
    </p>
  </div>
</template>

<style scoped>
.tag-row {
  display: grid;
  grid-template-columns: 20px minmax(120px, 1fr) 150px 104px 30px 28px;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
}
.tag-row.head {
  padding: 0 0 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
}
.head span:nth-child(2) {
  padding-left: 7px;
}
.head .c {
  text-align: center;
}
.dot {
  width: 16px;
  height: 16px;
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
  padding: 0 6px 0 calc(6px + var(--depth, 0) * 16px);
  border: 1px solid transparent;
  border-radius: 6px;
  background: none;
}
.name:hover,
.name:focus {
  border-color: var(--border);
  outline: none;
}
.pick {
  min-width: 0;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  font-size: 0.82rem;
}
.star,
.del {
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--faint);
  font-size: 1.05rem;
}
.star.on {
  color: var(--star);
}
.star:disabled {
  opacity: 0.4;
}
.star:hover:not(:disabled),
.del:hover {
  background: var(--hover);
}
.del:hover {
  color: var(--late);
}
.colors {
  max-width: 260px;
  margin: 8px 0 10px 28px;
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
/* Narrow screens: Inside and Side drop to a second line under the name. */
@media (max-width: 599px) {
  .tag-row {
    grid-template-columns: 20px 1fr 1fr 30px 28px;
    grid-template-areas: 'dot name name star del' '. inside side . .';
  }
  .tag-row.head {
    display: none;
  }
  .dot:not(.big) {
    grid-area: dot;
  }
  .name {
    grid-area: name;
  }
  .inside {
    grid-area: inside;
  }
  .side {
    grid-area: side;
  }
  .star {
    grid-area: star;
  }
  .del {
    grid-area: del;
  }
}
</style>
