<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { state } from '../data/store.js'
import { addDays, todayLocal } from '../domain/dates.js'
import { sortTodos } from '../domain/todos.js'
import { withDescendants } from '../domain/tags.js'
import { context } from '../lib/context.js'
import { deleteTodoWithUndo, isTyping, isDeleteKey } from '../lib/quickActions.js'
import QuickAdd from '../components/QuickAdd.vue'
import TodoRow from '../components/TodoRow.vue'
import TodoDetail from '../components/TodoDetail.vue'
import OverviewPanel from '../components/OverviewPanel.vue'
import Icon from '../components/Icon.vue'
import TagEditor from '../components/TagEditor.vue'

// Every to-do on the current side: the full brain-dump list.
const router = useRouter()
const route = useRoute()
const today = todayLocal()

// ?tag=<id> (from the sidebar) narrows the list to one tag and the tags nested inside it.
const tag = computed(() => state.tags.find((t) => t.id === route.query.tag) ?? null)
const tagIds = computed(() => (tag.value ? withDescendants(state.tags, tag.value.id) : null))
const mine = computed(() =>
  state.todos.filter((t) => t.scope === context.scope && (!tagIds.value || t.tag_ids?.some((id) => tagIds.value.has(id)))),
)
const open = computed(() => sortTodos(mine.value.filter((t) => !t.done_on)))
const groups = computed(() =>
  [
    { title: 'Overdue', todos: open.value.filter((t) => t.due_date && t.due_date < today) },
    { title: 'Scheduled', todos: open.value.filter((t) => t.due_date && t.due_date >= today) },
    { title: 'Anytime', todos: open.value.filter((t) => !t.due_date) },
  ].filter((g) => g.todos.length),
)
// Finished in the last 30 days, most recent first.
const recentDone = computed(() =>
  mine.value
    .filter((t) => t.done_on && t.done_on >= addDays(today, -30))
    .sort((a, b) => (a.done_on < b.done_on ? 1 : -1)),
)
const showDone = ref(false)

// Same panel behavior as Today: details slide in on wide screens; phones open a page.
const selectedId = ref(null)
const media = window.matchMedia('(min-width: 1100px)')
const wide = ref(media.matches)
const onMedia = (e) => (wide.value = e.matches)
// With a to-do selected: Esc closes it, Delete removes it (with Undo).
const onKey = (e) => {
  if (isTyping()) return
  if (e.key === 'Escape') selectedId.value = null
  else if (detailOpen.value && isDeleteKey(e)) {
    e.preventDefault()
    deleteTodoWithUndo(state.todos.find((t) => t.id === selectedId.value))
  }
}
onMounted(() => {
  media.addEventListener('change', onMedia)
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  media.removeEventListener('change', onMedia)
  document.removeEventListener('keydown', onKey)
})
function select(id) {
  if (!wide.value) return router.push(`/todo/${id}`)
  selectedId.value = selectedId.value === id ? null : id
}
const detailOpen = computed(() => Boolean(selectedId.value && state.todos.some((t) => t.id === selectedId.value)))
function clickOutside(event) {
  if (!event.target.isConnected) return // a button that removed itself on click
  if (detailOpen.value && !event.target.closest('.row, .panel-side, dialog')) selectedId.value = null
}
</script>

<template>
  <div class="todos" :class="{ 'with-panel': wide }" @click="clickOutside">
    <div class="main">
      <h1 class="page-title">
        <Icon name="inbox" class="inbox" />To-dos
        <template v-if="tag">
          <TagEditor :tag="tag" />
          <router-link to="/todos" class="clear-tag" aria-label="Show all to-dos"><Icon name="close" /></router-link>
        </template>
      </h1>
      <QuickAdd :preset-tags="tag ? [tag.id] : []" />

      <section v-for="g in groups" :key="g.title">
        <h2 class="section-head" :class="{ late: g.title === 'Overdue' }">{{ g.title }} <span class="count">{{ g.todos.length }}</span></h2>
        <TransitionGroup name="row" tag="div">
          <TodoRow v-for="t in g.todos" :key="t.id" :todo="t" :today="today" :selected="selectedId === t.id" @select="select" />
        </TransitionGroup>
      </section>
      <p v-if="!open.length" class="empty">Nothing here. Type above to add one.</p>

      <section v-if="recentDone.length" class="completed" :class="{ open: showDone }">
        <button class="section-head done-head" :aria-expanded="showDone" @click="showDone = !showDone">
          <span><Icon name="chevron" class="chev" />Completed</span><span class="count">{{ recentDone.length }}</span>
        </button>
        <template v-if="showDone">
          <TodoRow v-for="t in recentDone" :key="t.id" :todo="t" :today="today" :selected="selectedId === t.id" @select="select" />
        </template>
      </section>
    </div>

    <aside v-if="wide" class="panel-side">
      <div class="layer base"><OverviewPanel :date="today" :today="today" @select="(id) => router.push(`/task/${id}`)" @select-todo="select" /></div>
      <Transition name="slide">
        <div v-if="detailOpen" class="layer over">
          <TodoDetail :id="selectedId" :today="today" closable @close="selectedId = null" @deleted="selectedId = null" />
        </div>
      </Transition>
    </aside>
  </div>
</template>

<style scoped>
.main {
  max-width: 680px;
  margin: 0 auto;
}
.inbox {
  color: var(--accent);
}
.clear-tag {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  color: var(--muted);
}
.clear-tag:hover {
  background: var(--hover);
}
.clear-tag svg {
  width: 15px;
  height: 15px;
}
.section-head.late {
  color: var(--late);
}
.empty {
  margin: 36px 0;
  color: var(--muted);
  text-align: center;
}
.completed {
  margin-top: 10px;
}
.done-head {
  width: 100%;
  border-top: 0;
  border-left: 0;
  border-right: 0;
  background: none;
  color: var(--muted);
  cursor: pointer;
}
.done-head span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.chev {
  width: 13px;
  height: 13px;
  transition: transform 0.2s;
}
.completed.open .chev {
  transform: rotate(90deg);
}
.row-move,
.row-enter-active,
.row-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.row-enter-from,
.row-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
@media (min-width: 900px) {
  .main {
    padding: 34px 40px 80px;
  }
}
@media (min-width: 1100px) {
  .todos.with-panel {
    display: grid;
    grid-template-columns: 1fr clamp(380px, 34vw, 500px);
    height: 100%;
  }
  .with-panel .main {
    width: 100%;
    overflow: auto;
  }
  .panel-side {
    position: relative;
    overflow: hidden;
    border-left: 1px solid var(--border);
    background: var(--surface);
  }
  .layer {
    position: absolute;
    inset: 0;
    overflow: auto;
    padding: 30px 24px;
    background: var(--surface);
  }
  .layer.over {
    box-shadow: -10px 0 28px rgb(0 0 0 / 0.08);
  }
  .slide-enter-active,
  .slide-leave-active {
    transition: transform 0.32s cubic-bezier(0.22, 0.8, 0.24, 1), box-shadow 0.32s;
  }
  .slide-enter-from,
  .slide-leave-to {
    transform: translateX(100%);
    box-shadow: none;
  }
}
</style>
