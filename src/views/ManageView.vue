<script setup>
import { ref, computed, watch } from 'vue'
import { state, setActive, pauseTask, resumeTask, updateTask } from '../data/store.js'
import { todayLocal } from '../domain/dates.js'
import { openPause, currentVacation } from '../domain/pauses.js'
import { hasSeason } from '../domain/season.js'
import { hasDue, describeDue } from '../domain/due.js'
import { formatShortDate } from '../lib/format.js'
import { context } from '../lib/context.js'
import VacationPanel from '../components/VacationPanel.vue'
import PlaneIcon from '../components/PlaneIcon.vue'

// Search matches any part of the name, ignoring case and accents.
const query = ref('')
const fold = (text) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const searching = computed(() => query.value.trim() !== '')

const sorted = computed(() => {
  const q = fold(query.value.trim())
  return state.tasks
    .filter((t) => t.scope === context.scope)
    .filter((t) => !q || fold(t.name).includes(q))
    .sort((a, b) => a.sort_order - b.sort_order)
})
const groups = computed(() =>
  [
    { title: 'Habits', kind: 'habit', tasks: sorted.value.filter((t) => t.kind === 'habit') },
    { title: 'Chores', kind: 'chore', tasks: sorted.value.filter((t) => t.kind === 'chore') },
  ].filter((g) => !searching.value || g.tasks.length),
)

const PER = { day: 'day', week: 'week', biweek: '2 weeks', month: 'month', year: 'year' }
function describe(task) {
  const amount = task.unit_type === 'quantity'
    ? `${Number(task.target).toLocaleString()} ${task.unit_label ?? ''}`.trim()
    : `${task.target}×`
  let text = `${amount} / ${PER[task.period]}`
  if (hasDue(task)) {
    text += ` · ${describeDue(task)}`
    if (task.grace_days) text += ` +${task.grace_days}d grace`
  }
  if (hasSeason(task)) text += ` · ${formatShortDate(task.season_start)} – ${formatShortDate(task.season_end)}`
  return text
}

const isPaused = (task) => Boolean(openPause(task, state.pauses))

async function toggleActive(task, event) {
  if (!task.active && state.completions.some((c) => c.task_id === task.id)) {
    const ok = confirm(`Turn "${task.name}" back on? It starts fresh today. Earlier history won't count toward its streak or stats.`)
    if (!ok) {
      event.target.checked = false
      return
    }
  }
  await setActive(task, !task.active, todayLocal())
}

// The vacation section is tucked behind the airplane button.
const vacationOpen = ref(false)
const vacationSet = computed(() => Boolean(currentVacation(state.vacations, todayLocal())))

// When on, the list highlights tasks that pause on vacation and lets you add or remove them in place.
const vacationMode = ref(false)
watch(vacationOpen, (open) => {
  if (!open) vacationMode.value = false
})
const toggleVacationPause = (task) => updateTask(task, { pauses_on_vacation: !task.pauses_on_vacation })

const togglePause = (task) => (isPaused(task) ? resumeTask(task, todayLocal()) : pauseTask(task, todayLocal()))
</script>

<template>
  <div class="page">
  <header class="head">
    <h1 class="page-title">Routines</h1>
    <div class="head-actions">
      <button
        class="plane"
        :class="{ open: vacationOpen, set: vacationSet }"
        :aria-expanded="vacationOpen"
        :aria-label="vacationSet ? 'Vacation (set)' : 'Vacation'"
        :title="vacationSet ? 'Vacation is set' : 'Vacation'"
        @click="vacationOpen = !vacationOpen"
      >
        <PlaneIcon />
        <span v-if="vacationSet" class="dot" aria-hidden="true"></span>
      </button>
      <router-link to="/manage/new" class="btn primary add">+ New</router-link>
    </div>
  </header>

  <div class="search">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
    <input
      v-model="query"
      type="search"
      class="input"
      placeholder="Search tasks"
      aria-label="Search tasks"
      autocomplete="off"
      enterkeyhint="search"
    />
    <button v-if="searching" class="clear" aria-label="Clear search" @click="query = ''">✕</button>
  </div>

  <!-- Opened with the airplane button; hidden while searching unless you're picking vacation tasks. -->
  <VacationPanel v-if="vacationOpen" v-show="!searching || vacationMode" v-model:highlight="vacationMode" />

  <section v-for="group in groups" :key="group.kind" class="group">
    <h2 class="section-head" :class="group.kind">{{ group.title }} <span class="count">{{ group.tasks.length }}</span></h2>
    <ul>
      <li v-for="task in group.tasks" :key="task.id" class="row" :class="[group.kind, { off: !task.active, paused: task.active && isPaused(task), vac: vacationMode && task.pauses_on_vacation }]">
        <router-link :to="`/manage/${task.id}`" class="info">
          <span class="name">{{ task.name }}</span>
          <span class="desc">{{ describe(task) }}</span>
        </router-link>
        <button
          v-if="vacationMode"
          class="vac-btn"
          :class="{ on: task.pauses_on_vacation }"
          :aria-pressed="task.pauses_on_vacation"
          :aria-label="`${task.name} pauses on vacation`"
          :title="task.pauses_on_vacation ? 'Pauses on vacation' : 'Add to vacation pauses'"
          @click="toggleVacationPause(task)"
        >
          <PlaneIcon />
        </button>
        <template v-else>
        <button
          v-if="task.active"
          class="icon-btn"
          :class="{ paused: isPaused(task) }"
          :aria-label="`${isPaused(task) ? 'Resume' : 'Pause'} ${task.name}`"
          :title="isPaused(task) ? 'Resume' : 'Pause'"
          @click="togglePause(task)"
        >
          <svg v-if="isPaused(task)" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5.5" width="3.8" height="13" rx="1" /><rect x="13.7" y="5.5" width="3.8" height="13" rx="1" /></svg>
        </button>
        <label class="switch" :title="task.active ? 'On' : 'Off'">
          <input type="checkbox" :checked="task.active" @change="toggleActive(task, $event)" />
          <span class="track" aria-hidden="true"></span>
          <span class="sr-only">{{ task.name }} on</span>
        </label>
        </template>
      </li>
      <li v-if="!group.tasks.length" class="empty">None yet.</li>
    </ul>
  </section>
  <p v-if="searching && !sorted.length" class="no-match">No tasks match “{{ query.trim() }}”.</p>
  </div>
</template>

<style scoped>
.page {
  max-width: 680px;
  margin: 0 auto;
}
@media (min-width: 900px) {
  .page {
    padding: 34px 40px 80px;
  }
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.plane {
  position: relative;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--muted);
}
.plane.set {
  color: var(--vacation);
}
.plane.open {
  border-color: var(--vacation);
  background: var(--vacation-soft);
  color: var(--vacation);
}
.plane .dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vacation);
  box-shadow: 0 0 0 2px var(--surface);
}
.search {
  position: sticky;
  top: 8px;
  z-index: 2;
  margin-bottom: 12px;
}
.search svg {
  position: absolute;
  left: 12px;
  top: 50%;
  width: 18px;
  height: 18px;
  transform: translateY(-50%);
  fill: none;
  stroke: var(--muted);
  stroke-width: 2;
  stroke-linecap: round;
  pointer-events: none;
}
.search .input {
  padding: 0 40px 0 38px;
  border-color: transparent;
  border-radius: 10px;
  background: var(--raised);
  font-size: 1rem; /* 16px+ stops iPhone zooming in on focus */
}
.search .input::-webkit-search-cancel-button {
  display: none;
}
.clear {
  position: absolute;
  right: 4px;
  top: 50%;
  width: 36px;
  height: 36px;
  transform: translateY(-50%);
  border: none;
  background: none;
  color: var(--muted);
}
.no-match {
  margin-top: 20px;
  text-align: center;
  color: var(--muted);
}
.add {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.group {
  margin-top: 6px;
}
ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 -10px;
  padding: 4px 10px;
  border-radius: 8px;
}
@media (hover: hover) {
  .row:hover {
    background: var(--hover);
  }
}
.row.off .info,
.row.paused .info {
  opacity: 0.5;
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
  color: inherit;
  text-decoration: none;
}
.name {
  font-weight: 500;
}
.desc {
  font-size: 0.8rem;
  color: var(--muted);
}
.empty {
  color: var(--muted);
  font-size: 0.9rem;
}

/* On/off switch */
.switch {
  position: relative;
  flex-shrink: 0;
  width: 46px;
  height: 28px;
  cursor: pointer;
}
.switch input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}
.switch .track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--switch-off);
  transition: background 0.15s;
}
.switch .track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
  transition: transform 0.15s;
}
.switch input:checked + .track {
  background: var(--switch-on);
}
.switch input:checked + .track::after {
  transform: translateX(18px);
}

/* Vacation highlight mode */
.row.vac {
  background: var(--vacation-soft);
  box-shadow: inset 0 0 0 2px var(--vacation);
}
.vac-btn {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1.5px dashed var(--muted);
  border-radius: 50%;
  background: var(--surface);
  color: var(--muted);
  opacity: 0.7;
}
.vac-btn.on {
  border: 1.5px solid var(--vacation);
  background: var(--vacation);
  color: #fff;
  opacity: 1;
}

/* Pause / play */
.icon-btn {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text);
}
.icon-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}
.icon-btn.paused {
  background: var(--neutral-soft);
}
.switch input:focus-visible + .track {
  outline: 2px solid var(--habit);
  outline-offset: 2px;
}
</style>
