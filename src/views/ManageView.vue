<script setup>
import { ref, computed } from 'vue'
import { state, setActive, pauseTask, resumeTask, updateTask } from '../data/store.js'
import { todayLocal, WEEKDAY_SHORT } from '../domain/dates.js'
import { openPause } from '../domain/pauses.js'
import { signOut } from '../data/session.js'
import VacationPanel from '../components/VacationPanel.vue'

const sorted = computed(() => [...state.tasks].sort((a, b) => a.sort_order - b.sort_order))
const groups = computed(() => [
  { title: 'Habits', kind: 'habit', tasks: sorted.value.filter((t) => t.kind === 'habit') },
  { title: 'Chores', kind: 'chore', tasks: sorted.value.filter((t) => t.kind === 'chore') },
])

const PER = { day: 'day', week: 'week', biweek: '2 weeks', month: 'month' }
function describe(task) {
  const amount = task.unit_type === 'quantity'
    ? `${Number(task.target).toLocaleString()} ${task.unit_label ?? ''}`.trim()
    : `${task.target}×`
  let text = `${amount} / ${PER[task.period]}`
  if (task.pinned_day != null) {
    text += ` · ${WEEKDAY_SHORT[task.pinned_day]}`
    if (task.grace_days) text += ` +${task.grace_days}d grace`
  }
  return `${text} · ${task.scope === 'work' ? 'Work' : 'Personal'}`
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

// When on, the list highlights tasks that pause on vacation and lets you add or remove them in place.
const vacationMode = ref(false)
const toggleVacationPause = (task) => updateTask(task, { pauses_on_vacation: !task.pauses_on_vacation })

const togglePause = (task) => (isPaused(task) ? resumeTask(task, todayLocal()) : pauseTask(task, todayLocal()))
</script>

<template>
  <header class="head">
    <h1>Manage</h1>
    <router-link to="/manage/new" class="btn primary add">+ Add task</router-link>
  </header>

  <VacationPanel v-model:highlight="vacationMode" />

  <section v-for="group in groups" :key="group.kind" class="group">
    <h2>{{ group.title }}</h2>
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
          @click="toggleVacationPause(task)"
        >
          {{ task.pauses_on_vacation ? '🌴 Pauses' : '+ Add' }}
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

  <button v-if="!state.demo" class="btn sign-out" @click="signOut">Sign out</button>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
h1 {
  margin: 0;
  font-size: 1.4rem;
}
.add {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.group {
  margin-top: 20px;
}
h2 {
  margin: 0 0 8px;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 8px 0;
  border: 1px solid var(--border);
  border-left: 4px solid var(--habit);
  border-radius: 12px;
  background: var(--surface);
}
.row.chore {
  border-left-color: var(--chore);
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
  padding: 4px 0 4px 12px;
  color: inherit;
  text-decoration: none;
}
.name {
  font-weight: 600;
}
.desc {
  font-size: 0.8rem;
  color: var(--muted);
}
.sign-out {
  display: block;
  margin: 28px auto 0;
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
  min-width: 96px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px dashed var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  font-weight: 600;
  font-size: 0.85rem;
}
.vac-btn.on {
  border: 1px solid var(--vacation);
  background: var(--vacation);
  color: var(--surface);
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
