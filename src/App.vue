<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { state, addTag, updateTag } from './data/store.js'
import { isConfigured, signOut } from './data/session.js'
import { todayLists } from './data/todayList.js'
import { todayLocal } from './domain/dates.js'
import { context } from './lib/context.js'
import { tagTree, withDescendants, parentChoices, moveTag, paletteColor, nextColor } from './domain/tags.js'
import ContextSwitch from './components/ContextSwitch.vue'
import Icon from './components/Icon.vue'
import TagEditPop from './components/TagEditPop.vue'
import ColorGrid from './components/ColorGrid.vue'

// Any failed save (e.g. offline) shows a banner instead of failing silently.
const onFailure = (event) => {
  state.error = `Couldn't save that: ${event.reason?.message ?? event.reason}`
}
onMounted(() => window.addEventListener('unhandledrejection', onFailure))
onUnmounted(() => window.removeEventListener('unhandledrejection', onFailure))

const todayCount = computed(() => {
  const l = todayLists(todayLocal(), context.scope)
  return l.open.length + l.openTodos.length
})
const todoCount = computed(() => state.todos.filter((t) => t.scope === context.scope && !t.done_on).length)
// Tags as a tree; a folded tag hides everything inside it. Counts include nested tags.
const collapsed = ref(new Set(readCollapsed()))
function readCollapsed() {
  try {
    return JSON.parse(localStorage.getItem('upkeep-tags-collapsed')) ?? []
  } catch {
    return []
  }
}
function fold(id) {
  const next = new Set(collapsed.value)
  next.has(id) ? next.delete(id) : next.add(id)
  collapsed.value = next
  try {
    localStorage.setItem('upkeep-tags-collapsed', JSON.stringify([...next]))
  } catch {}
}
const sideTags = computed(() => {
  const rows = []
  let hideBelow = Infinity // depth under a folded tag
  for (const row of tagTree(state.tags, context.scope)) {
    if (row.depth > hideBelow) continue
    hideBelow = collapsed.value.has(row.tag.id) && row.hasChildren ? row.depth : Infinity
    rows.push(row)
  }
  return rows
})
function tagCount(id) {
  const ids = withDescendants(state.tags, id)
  return state.todos.filter((t) => t.scope === context.scope && !t.done_on && t.tag_ids?.some((x) => ids.has(x))).length
}

// Sidebar tag tools: + adds one inline; the ⋯ button (or right-click) edits one.
const route = useRoute()
const router = useRouter()
const adding = ref(false)
const newTag = ref({ name: '', color: null, parent_id: '' })
const newTagInput = ref(null)
const newParents = computed(() => parentChoices(state.tags, context.scope, null))
async function startAdd() {
  newTag.value = { name: '', color: nextColor(state.tags), parent_id: '' }
  adding.value = true
  await nextTick()
  newTagInput.value?.focus()
  newTagInput.value?.closest('form').scrollIntoView({ block: 'nearest' })
}
async function createTag() {
  const { name, color, parent_id } = newTag.value
  adding.value = false
  if (name.trim()) await addTag({ name: name.trim(), color, parent_id: parent_id || null, scope: context.scope })
}
// Leaving the add box saves what's typed; clicks inside it (color, Inside) don't.
const leaveAdd = (e) => {
  if (!e.currentTarget.contains(e.relatedTarget)) createTag()
}
// Drag tags to rearrange: drop on the top or bottom edge of another tag to go above
// or below it, on its middle to go inside it, or on the "Tags" heading for first place.
const dragging = ref(null) // the tag being dragged
const dropAt = ref(null) // { id, where } under the pointer; id null = the heading
const canDrop = (target) => dragging.value && (!target || !withDescendants(state.tags, dragging.value.id).has(target.id))
function dragStart(tag, event) {
  dragging.value = tag
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', tag.name)
}
function dragOver(target, event) {
  if (!canDrop(target)) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  if (!target) return (dropAt.value = { id: null, where: 'top' })
  const box = event.currentTarget.getBoundingClientRect()
  const y = (event.clientY - box.top) / box.height
  dropAt.value = { id: target.id, where: y < 0.3 ? 'before' : y > 0.7 ? 'after' : 'inside' }
}
function dragLeave(target, event) {
  if (!event.currentTarget.contains(event.relatedTarget) && dropAt.value?.id === (target?.id ?? null)) dropAt.value = null
}
async function drop(target) {
  const tag = dragging.value
  const where = canDrop(target) && dropAt.value?.where
  dragEnd()
  if (!where) return
  const saves = moveTag(state.tags, context.scope, tag.id, target?.id ?? null, where)
  await Promise.all(saves.map((s) => updateTag(state.tags.find((t) => t.id === s.id), s.patch)))
  if (where === 'inside' && collapsed.value.has(target.id)) fold(target.id) // open it so you see where it went
}
function dragEnd() {
  dragging.value = null
  dropAt.value = null
}
const dropClass = (id) => (dropAt.value?.id === id ? `drop-${dropAt.value.where}` : '')

const editing = ref(null) // { tag, anchor }
const editPop = ref(null)
function editTag(tag, event) {
  if (editing.value?.tag === tag) return editPop.value?.close()
  editing.value = { tag, anchor: event.currentTarget.closest('.tag-wrap') }
}
function tagDeleted() {
  if (route.query.tag === editing.value?.tag.id) router.push('/todos')
  editing.value = null
}
const routineCount = computed(() => state.tasks.filter((t) => t.scope === context.scope && t.active).length)
</script>

<template>
  <router-view v-if="!state.ready" />

  <div v-else class="shell">
    <!-- Desktop: sidebar. Phones get the switch on top and tabs at the bottom instead. -->
    <aside class="sidebar">
      <ContextSwitch />
      <nav class="nav">
        <router-link to="/" class="nav-item" exact-active-class="on">
          <Icon name="star" />Today<span class="n">{{ todayCount || '' }}</span>
        </router-link>
        <router-link to="/todos" class="nav-item" active-class="" :class="{ on: $route.path.startsWith('/todo') && !$route.query.tag }">
          <Icon name="inbox" class="blue" />To-dos<span class="n">{{ todoCount || '' }}</span>
        </router-link>
        <router-link to="/manage" class="nav-item" active-class="on">
          <Icon name="routines" class="green" />Routines<span class="n">{{ routineCount || '' }}</span>
        </router-link>
      </nav>
      <div
        class="side-h"
        :class="{ 'drop-here': dropAt?.id === null, 'drop-hint': dragging }"
        @dragover="dragOver(null, $event)"
        @dragleave="dragLeave(null, $event)"
        @drop.prevent="drop(null)"
      >
        {{ dragging ? 'Drop here to move to the top' : 'Tags' }}
        <button class="side-add" title="New tag" aria-label="New tag" @click="startAdd"><Icon name="plus" /></button>
      </div>
      <nav class="nav tags">
        <div
          v-for="{ tag: t, depth, hasChildren } in sideTags"
          :key="t.id"
          class="tag-wrap"
          :class="[dropClass(t.id), { editing: editing?.tag === t, lifted: dragging === t }]"
          :style="{ '--depth': depth }"
          draggable="true"
          @dragstart="dragStart(t, $event)"
          @dragend="dragEnd"
          @dragover="dragOver(t, $event)"
          @dragleave="dragLeave(t, $event)"
          @drop.prevent="drop(t)"
        >
          <button
            v-if="hasChildren"
            class="fold"
            :class="{ shut: collapsed.has(t.id) }"
            :aria-label="collapsed.has(t.id) ? `Show tags inside ${t.name}` : `Hide tags inside ${t.name}`"
            @click="fold(t.id)"
          >
            <Icon name="chevron" />
          </button>
          <router-link
            :to="{ path: '/todos', query: { tag: t.id } }"
            class="nav-item tag-item"
            active-class=""
            :class="{ on: $route.query.tag === t.id }"
            @contextmenu.prevent="editTag(t, $event)"
          >
            <i :style="{ '--tag-bg': paletteColor(t.color).bg, '--tag-fg': paletteColor(t.color).fg }"></i>{{ t.name }}<span class="n">{{ tagCount(t.id) || '' }}</span>
          </router-link>
          <button class="tag-more" :aria-label="`Edit ${t.name}`" title="Edit tag" @click="editTag(t, $event)">⋯</button>
        </div>
        <form v-if="adding" class="tag-new" @submit.prevent="createTag" @focusout="leaveAdd" @keydown.esc="adding = false">
          <div class="tag-new-name">
            <i :style="{ '--tag-bg': paletteColor(newTag.color).bg, '--tag-fg': paletteColor(newTag.color).fg }"></i>
            <input ref="newTagInput" v-model="newTag.name" placeholder="Tag name" aria-label="New tag name" autocomplete="off" />
          </div>
          <ColorGrid v-model="newTag.color" />
          <label class="tag-new-inside">
            Inside
            <select v-model="newTag.parent_id">
              <option value="">Nothing (top level)</option>
              <option v-for="p in newParents" :key="p.tag.id" :value="p.tag.id">{{ '\u00a0\u00a0\u00a0'.repeat(p.depth) + p.tag.name }}</option>
            </select>
          </label>
          <button class="btn small">Add tag</button>
        </form>
      </nav>
      <TagEditPop
        v-if="editing"
        ref="editPop"
        :key="editing.tag.id"
        :tag="editing.tag"
        :anchor="editing.anchor"
        side="right"
        @close="editing = null"
        @deleted="tagDeleted"
      />
      <div class="side-bottom">
        <router-link to="/settings" class="icon-link" active-class="on" title="Settings" aria-label="Settings">
          <Icon name="settings" />
        </router-link>
      </div>
    </aside>

    <div class="content">
      <p v-if="state.error" class="error-banner" role="alert">
        {{ state.error }}
        <button aria-label="Dismiss" @click="state.error = ''">✕</button>
      </p>
      <p v-if="state.demo" class="demo-banner">
        Demo mode · sample data · changes reset when you reload
        <button v-if="isConfigured" class="link" @click="signOut">Exit</button>
      </p>
      <div v-if="['/', '/manage', '/todos', '/settings'].includes($route.path)" class="mobile-ctx"><ContextSwitch /></div>
      <router-view :key="$route.fullPath" />
    </div>

    <nav class="tabs">
      <router-link to="/" class="tab" exact-active-class="on"><Icon name="star" />Today</router-link>
      <router-link to="/todos" class="tab" active-class="on"><Icon name="inbox" />To-dos</router-link>
      <router-link to="/manage" class="tab" active-class="on"><Icon name="routines" />Routines</router-link>
      <router-link to="/settings" class="tab" active-class="on"><Icon name="settings" />Settings</router-link>
    </nav>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
}
.content {
  min-width: 0;
  padding: 10px 16px calc(84px + env(safe-area-inset-bottom));
}

/* ---------- Sidebar (desktop) ---------- */
.sidebar {
  display: none;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 18px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  color: var(--text);
  font-weight: 500;
  text-decoration: none;
}
.nav-item svg {
  width: 18px;
  height: 18px;
}
.nav-item .green {
  color: var(--switch-on);
}
.nav-item .blue {
  color: var(--accent);
}
.nav-item .n {
  margin-left: auto;
  color: var(--muted);
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}
.nav-item:hover {
  background: var(--hover);
}
.nav-item.on {
  background: var(--selected);
}
.side-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 22px 4px 4px 10px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
}
.side-add {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--muted);
  opacity: 0;
}
.sidebar:hover .side-add,
.side-add:focus-visible {
  opacity: 1;
}
.side-add:hover {
  background: var(--hover);
  color: var(--text);
}
.side-add svg {
  width: 13px;
  height: 13px;
}
.tag-wrap {
  position: relative;
  border-radius: 8px;
}
.tag-wrap.lifted {
  opacity: 0.4;
}
.tag-wrap.drop-inside,
.side-h.drop-here {
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1.5px var(--accent);
}
.side-h {
  border-radius: 6px;
}
/* A blue line shows where the tag will land. */
.tag-wrap.drop-before::before,
.tag-wrap.drop-after::after {
  content: '';
  position: absolute;
  left: calc(6px + var(--depth, 0) * 16px);
  right: 6px;
  height: 2px;
  border-radius: 1px;
  background: var(--accent);
  pointer-events: none;
}
.tag-wrap.drop-before::before {
  top: -1px;
}
.tag-wrap.drop-after::after {
  bottom: -1px;
}
.side-h.drop-hint {
  min-height: 26px;
  padding: 0 8px;
  margin-left: 4px;
  outline: 1.5px dashed var(--accent);
  outline-offset: -1.5px;
  color: var(--accent);
}
/* The ⋯ button takes the count's spot on hover. */
.tag-more {
  position: absolute;
  top: 50%;
  right: 4px;
  width: 26px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1;
  transform: translateY(-50%);
  opacity: 0;
}
.tag-wrap:hover .tag-more,
.tag-wrap.editing .tag-more,
.tag-more:focus-visible {
  opacity: 1;
}
.tag-wrap:hover .n,
.tag-wrap.editing .n {
  visibility: hidden;
}
.tag-more:hover {
  background: var(--hover);
  color: var(--text);
}
.tag-wrap.editing .tag-item {
  background: var(--hover);
}
.fold {
  position: absolute;
  top: 50%;
  left: calc(var(--depth, 0) * 16px - 6px);
  z-index: 1;
  display: grid;
  place-items: center;
  width: 16px;
  height: 20px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--muted);
  transform: translateY(-50%);
  opacity: 0;
}
.sidebar:hover .fold,
.fold.shut,
.fold:focus-visible {
  opacity: 1;
}
.fold svg {
  width: 10px;
  height: 10px;
  transform: rotate(90deg);
  transition: transform 0.15s;
}
.fold.shut svg {
  transform: none;
}
.tag-new {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 4px 0;
  padding: 8px;
  border-radius: 8px;
  background: var(--bg);
}
.tag-new-name {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tag-new i {
  flex: none;
  width: 12px;
  height: 12px;
  border: 1px solid color-mix(in srgb, var(--tag-fg) 35%, transparent);
  border-radius: 3px;
  background: var(--tag-bg);
}
.tag-new-inside {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: var(--muted);
}
.tag-new-inside select {
  flex: 1;
  min-width: 0;
  padding: 3px 4px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--raised);
  color: var(--text);
  font: inherit;
  font-size: 0.82rem;
}
.tag-new .btn {
  align-self: flex-start;
}
.tag-new input {
  flex: 1;
  min-width: 0;
  padding: 3px 6px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  outline: none;
}
.nav.tags {
  margin-top: 0;
}
.tag-item {
  padding: 5px 10px 5px calc(10px + var(--depth, 0) * 16px);
  font-size: 0.9rem;
}
.tag-item i {
  width: 10px;
  height: 10px;
  margin: 0 4px 0 4px;
  border: 1px solid color-mix(in srgb, var(--tag-fg) 35%, transparent);
  border-radius: 3px;
  background: var(--tag-bg);
}
/* Same colors as the tag chips (see TagChip). */
:root[data-theme='dark'] .tag-item i {
  border-color: transparent;
  background: color-mix(in srgb, var(--tag-fg) 55%, #1c1c1e);
}
.side-bottom {
  margin-top: auto;
  display: flex;
  gap: 4px;
}
.icon-link {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  color: var(--muted);
}
.icon-link svg {
  width: 18px;
  height: 18px;
}
.icon-link:hover,
.icon-link.on {
  background: var(--hover);
  color: var(--text);
}

/* ---------- Phone ---------- */
.mobile-ctx {
  margin: 4px 0 14px;
}
.tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  display: flex;
  justify-content: space-around;
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 64px;
  padding: 4px 0;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 500;
  text-decoration: none;
}
.tab svg {
  width: 22px;
  height: 22px;
}
.tab.on {
  color: var(--accent);
}

@media (min-width: 900px) {
  .shell {
    display: grid;
    grid-template-columns: 232px 1fr;
    height: 100vh;
  }
  .sidebar {
    --ctx-bg: #e9e9ee;
    display: flex;
    flex-direction: column;
    padding: 18px 12px 14px;
    border-right: 1px solid var(--border);
    background: var(--sidebar);
  }
  :root[data-theme='dark'] .sidebar {
    --ctx-bg: #303034;
  }
  .content {
    overflow: auto;
    padding: 0;
  }
  .mobile-ctx,
  .tabs {
    display: none;
  }
}

/* ---------- Banners ---------- */
.demo-banner,
.error-banner {
  margin: 0 0 10px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.8rem;
}
@media (min-width: 900px) {
  .demo-banner,
  .error-banner {
    margin: 10px 16px 0;
  }
}
.demo-banner {
  background: var(--raised);
  color: var(--muted);
  text-align: center;
}
.demo-banner .link {
  margin-left: 4px;
  padding: 0;
  border: none;
  background: none;
  color: var(--accent);
  font-size: inherit;
  font-weight: 600;
}
.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  background: #fbe3e0;
  color: #8a2219;
}
.error-banner button {
  border: none;
  background: none;
  color: inherit;
  font-size: 1rem;
}
</style>
