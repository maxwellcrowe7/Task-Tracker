<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { state } from '../data/store.js'
import { todayLists } from '../data/todayList.js'
import { addDays, dayOfWeek, todayLocal } from '../domain/dates.js'
import { formatDate } from '../lib/format.js'
import { context } from '../lib/context.js'
import TaskRow from '../components/TaskRow.vue'
import TaskDetail from '../components/TaskDetail.vue'
import OverviewPanel from '../components/OverviewPanel.vue'
import TodoRow from '../components/TodoRow.vue'
import TodoDetail from '../components/TodoDetail.vue'
import QuickAdd from '../components/QuickAdd.vue'
import Icon from '../components/Icon.vue'

const router = useRouter()

// Keep "today" right if the app stays open past midnight.
const today = ref(todayLocal())
const selectedDate = ref(today.value)
const refreshToday = () => {
  const now = todayLocal()
  if (now !== today.value) {
    if (selectedDate.value === today.value) selectedDate.value = now
    today.value = now
  }
}
onMounted(() => document.addEventListener('visibilitychange', refreshToday))
onUnmounted(() => document.removeEventListener('visibilitychange', refreshToday))

const isToday = computed(() => selectedDate.value === today.value)
const title = computed(() => {
  if (isToday.value) return 'Today'
  if (selectedDate.value === addDays(today.value, -1)) return 'Yesterday'
  return formatDate(selectedDate.value, { weekday: 'long' })
})
const subtitle = computed(() => formatDate(selectedDate.value, { weekday: 'long', month: 'long', day: 'numeric' }))

// Week strip: Sunday–Saturday around the selected day. Future days wait for Upcoming.
const weekStart = computed(() => addDays(selectedDate.value, -dayOfWeek(selectedDate.value)))
const week = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i)))
const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const shiftWeek = (days) => {
  const next = addDays(selectedDate.value, days)
  selectedDate.value = next > today.value ? today.value : next
}

// Something just checked off stays in place for a beat (so you see it tick), then
// slides down into Completed.
const lingering = ref(new Set())
function onDone(id) {
  lingering.value = new Set(lingering.value).add(id)
  setTimeout(() => {
    const next = new Set(lingering.value)
    next.delete(id)
    lingering.value = next
  }, 650)
}

const lists = computed(() => todayLists(selectedDate.value, context.scope, today.value))
const keep = (list) => list.filter((x) => lingering.value.has(x.id))
const open = computed(() => {
  const { open, done } = lists.value
  return [...open, ...keep(done)].sort((a, b) => a.sort_order - b.sort_order)
})
const openTodos = computed(() => {
  const { openTodos, doneTodos } = lists.value
  return [...openTodos, ...keep(doneTodos)]
})
const completed = computed(() => lists.value.done.filter((t) => !lingering.value.has(t.id)))
const completedTodos = computed(() => lists.value.doneTodos.filter((t) => !lingering.value.has(t.id)))
const sections = computed(() =>
  [
    { title: 'Habits', tasks: open.value.filter((t) => t.kind === 'habit') },
    { title: 'Chores', tasks: open.value.filter((t) => t.kind === 'chore') },
  ].filter((s) => s.tasks.length),
)
const doneCount = computed(() => completed.value.length + completedTodos.value.length)
const nothingOpen = computed(() => !sections.value.length && !openTodos.value.length)
const showCompleted = ref(false)

// Selecting a routine or to-do: side panel on wide screens, its own page on phones.
const selected = ref(null) // { kind: 'task' | 'todo', id }
const selectedId = computed(() => selected.value?.id ?? null)
const wide = ref(window.matchMedia('(min-width: 1100px)').matches)
const media = window.matchMedia('(min-width: 1100px)')
const onMedia = (e) => (wide.value = e.matches)
onMounted(() => media.addEventListener('change', onMedia))
onUnmounted(() => media.removeEventListener('change', onMedia))
function choose(kind, id) {
  if (!wide.value) return router.push(kind === 'todo' ? `/todo/${id}` : `/task/${id}`)
  selected.value = selectedId.value === id ? null : { kind, id }
}
const select = (id) => choose('task', id)
const selectTodo = (id) => choose('todo', id)
const closeDetail = () => (selected.value = null)
// Wide screens always show the right panel: the open task's details, or the overview.
const detailOpen = computed(() => {
  const s = selected.value
  if (!s) return false
  return (s.kind === 'todo' ? state.todos : state.tasks).some((t) => t.id === s.id)
})

// Clicking anywhere on the page outside a task row (or pressing Esc) closes the details.
function clickOutside(event) {
  if (detailOpen.value && !event.target.closest('.row, .panel-side, dialog')) closeDetail()
}
const onKey = (e) => {
  if (e.key === 'Escape' && detailOpen.value && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) closeDetail()
}
onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="today" :class="{ 'with-panel': wide }" @click="clickOutside">
    <div class="main">
      <header class="head">
        <div>
          <h1 class="page-title"><Icon v-if="isToday" name="star" />{{ title }}</h1>
          <p class="subtitle">
            {{ subtitle }}
            <button v-if="!isToday" class="link" @click="selectedDate = today">Back to today</button>
          </p>
        </div>
        <div class="week">
          <button class="nudge" aria-label="Previous week" @click="shiftWeek(-7)"><Icon name="chevron" class="flip" /></button>
          <button
            v-for="(date, i) in week"
            :key="date"
            class="day"
            :class="{ on: date === selectedDate, now: date === today }"
            :disabled="date > today"
            :aria-label="formatDate(date)"
            :aria-pressed="date === selectedDate"
            @click="selectedDate = date"
          >
            {{ LETTERS[i] }}<b>{{ Number(date.slice(8)) }}</b>
          </button>
          <button class="nudge" aria-label="Next week" :disabled="weekStart >= addDays(today, -dayOfWeek(today))" @click="shiftWeek(7)">
            <Icon name="chevron" />
          </button>
        </div>
      </header>

      <QuickAdd v-if="isToday" />

      <section v-for="s in sections" :key="s.title">
        <h2 class="section-head">{{ s.title }} <span class="count">{{ s.tasks.length }}</span></h2>
        <TransitionGroup name="row" tag="div">
          <TaskRow
            v-for="task in s.tasks"
            :key="task.id"
            :task="task"
            :date="selectedDate"
            :today="today"
            :selected="selectedId === task.id"
            @select="select"
            @done="onDone"
          />
        </TransitionGroup>
      </section>

      <section v-if="openTodos.length">
        <h2 class="section-head">To-dos <span class="count">{{ openTodos.length }}</span></h2>
        <TransitionGroup name="row" tag="div">
          <TodoRow
            v-for="todo in openTodos"
            :key="todo.id"
            :todo="todo"
            :today="today"
            :selected="selectedId === todo.id"
            @select="selectTodo"
            @done="onDone"
          />
        </TransitionGroup>
      </section>

      <p v-if="nothingOpen && !doneCount" class="empty">Nothing on the list. Enjoy it.</p>
      <p v-else-if="nothingOpen" class="empty">All done for {{ isToday ? 'today' : 'this day' }}.</p>

      <section v-if="doneCount" class="completed" :class="{ open: showCompleted }">
        <button class="section-head done-head" :aria-expanded="showCompleted" @click="showCompleted = !showCompleted">
          <span><Icon name="chevron" class="chev" />Completed</span><span class="count">{{ doneCount }}</span>
        </button>
        <TransitionGroup v-if="showCompleted" name="row" tag="div">
          <TaskRow
            v-for="task in completed"
            :key="task.id"
            :task="task"
            :date="selectedDate"
            :today="today"
            :selected="selectedId === task.id"
            @select="select"
          />
          <TodoRow
            v-for="todo in completedTodos"
            :key="todo.id"
            :todo="todo"
            :today="today"
            :selected="selectedId === todo.id"
            @select="selectTodo"
          />
        </TransitionGroup>
      </section>
    </div>

    <!-- The overview is always there; a task's details slide in over it from the right. -->
    <aside v-if="wide" class="panel-side">
      <div class="layer base"><OverviewPanel :date="selectedDate" :today="today" @select="select" @select-todo="selectTodo" /></div>
      <Transition name="slide">
        <div v-if="detailOpen" class="layer over">
          <TodoDetail v-if="selected.kind === 'todo'" :id="selectedId" :today="today" closable @close="closeDetail" @deleted="closeDetail" />
          <TaskDetail v-else :id="selectedId" :today="today" closable @close="closeDetail" />
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
.head {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.subtitle {
  margin: 3px 0 0;
  color: var(--muted);
}
.page-title + .subtitle {
  margin-left: 0;
}
.link {
  margin-left: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font-weight: 600;
}

/* Week strip */
.week {
  display: flex;
  align-items: center;
  gap: 2px;
}
.day {
  flex: 1;
  min-width: 0;
  padding: 5px 0 6px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 500;
  text-align: center;
}
.day b {
  display: block;
  margin-top: 2px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}
.day.now:not(.on) b {
  color: var(--accent);
}
@media (hover: hover) {
  .day:hover:not(:disabled):not(.on) {
    background: var(--hover);
  }
}
.day.on {
  background: var(--accent);
  color: rgb(255 255 255 / 0.8);
}
.day.on b {
  color: #fff;
}
.day:disabled {
  opacity: 0.35;
}
.nudge {
  flex: none;
  display: grid;
  place-items: center;
  width: 26px;
  height: 40px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--muted);
}
.nudge svg {
  width: 15px;
  height: 15px;
}
.flip {
  transform: rotate(180deg);
}

.empty {
  margin: 36px 0;
  color: var(--muted);
  text-align: center;
}

/* Completed */
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

/* Rows sliding in and out */
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
.row-leave-active {
  position: absolute;
  width: 100%;
}

@media (min-width: 900px) {
  .main {
    padding: 34px 40px 80px;
  }
  .head {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
  }
  .week {
    width: 330px;
  }
}
@media (min-width: 1100px) {
  .today.with-panel {
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
  @media (prefers-reduced-motion: reduce) {
    .slide-enter-active,
    .slide-leave-active {
      transition: none;
    }
  }
}
</style>
