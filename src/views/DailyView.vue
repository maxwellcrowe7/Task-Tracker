<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { state } from '../data/store.js'
import { addDays, todayLocal } from '../domain/dates.js'
import { formatDate } from '../lib/format.js'
import { inSeason } from '../domain/season.js'
import TaskCard from '../components/TaskCard.vue'

// Keep "today" right if the app stays open past midnight.
const today = ref(todayLocal())
const selected = ref(today.value)
const refreshToday = () => {
  const now = todayLocal()
  if (now !== today.value) {
    if (selected.value === today.value) selected.value = now
    today.value = now
  }
}
onMounted(() => document.addEventListener('visibilitychange', refreshToday))
onUnmounted(() => document.removeEventListener('visibilitychange', refreshToday))

const isToday = computed(() => selected.value === today.value)
const dateLabel = computed(() => {
  if (isToday.value) return 'Today'
  if (selected.value === addDays(today.value, -1)) return 'Yesterday'
  return formatDate(selected.value)
})

const filters = [
  { value: 'all', label: 'All' },
  { value: 'personal', label: 'Personal' },
  { value: 'work', label: 'Work' },
]
const filter = ref('all')

const visibleTasks = computed(() =>
  state.tasks
    .filter((t) => t.active && t.active_since <= selected.value && inSeason(t, selected.value))
    .filter((t) => filter.value === 'all' || t.scope === filter.value)
    .sort((a, b) => a.sort_order - b.sort_order),
)
</script>

<template>
  <header class="day-nav">
    <button class="arrow" aria-label="Previous day" @click="selected = addDays(selected, -1)">‹</button>
    <button class="date" :disabled="isToday" @click="selected = today">
      <span class="brand-text">{{ dateLabel }}</span>
      <small v-if="!isToday">Back to today</small>
    </button>
    <button class="arrow" aria-label="Next day" :disabled="isToday" @click="selected = addDays(selected, 1)">›</button>
  </header>

  <nav class="chips">
    <button
      v-for="f in filters"
      :key="f.value"
      class="chip"
      :class="{ on: filter === f.value }"
      :aria-pressed="filter === f.value"
      @click="filter = f.value"
    >
      {{ f.label }}
    </button>
  </nav>

  <main class="list">
    <TaskCard v-for="task in visibleTasks" :key="task.id" :task="task" :date="selected" :today="today" />
    <p v-if="!visibleTasks.length" class="empty">Nothing here.</p>
  </main>
</template>

<style scoped>
.day-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.arrow {
  width: 48px;
  height: 48px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
  font-size: 1.6rem;
  line-height: 1;
}
.date {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: none;
  background: none;
  font-size: 1.4rem;
  font-weight: 800;
}
.date:disabled {
  opacity: 1;
}
.date small {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--habit);
}
.chips {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.chip {
  min-height: 36px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  font-size: 0.9rem;
}
.chip.on {
  border-color: transparent;
  background: var(--brand);
  color: #fff;
  font-weight: 600;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.empty {
  color: var(--muted);
  text-align: center;
}
</style>
