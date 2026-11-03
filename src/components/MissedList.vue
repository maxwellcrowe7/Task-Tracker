<script setup>
import { ref, computed } from 'vue'
import { state, fillMiss, dismissMiss, removeLastCompletion, updateTask } from '../data/store.js'
import { missedPeriods } from '../domain/missed.js'
import { hasDue } from '../domain/due.js'
import { addDays } from '../domain/dates.js'
import { formatDate, formatShortDate } from '../lib/format.js'
import { context } from '../lib/context.js'
import { showToast } from '../lib/toast.js'
import Icon from './Icon.vue'

// Habits and chores from the last two weeks that slipped by without being checked off.
// "Did it" logs it on the day it was due; "Missed it" keeps it as a miss and clears it
// from this list. Collapsed by default, so it reads as a notice with a count; hidden
// when there's nothing to review.
const props = defineProps({
  today: { type: String, required: true },
})
const emit = defineEmits(['select'])

const misses = computed(() =>
  state.tasks
    .filter((t) => t.scope === context.scope)
    .flatMap((task) => missedPeriods(task, state.completions, state.pauses, state.vacations, props.today).map((m) => ({ task, ...m })))
    .sort((a, b) => (a.closes < b.closes ? 1 : a.closes > b.closes ? -1 : a.task.sort_order - b.task.sort_order)),
)

// A long list (say, after a week away) shows the newest few until you ask for the rest.
const FEW = 5
const open = ref(false)
const showAll = ref(false)
const shown = computed(() => (showAll.value ? misses.value : misses.value.slice(0, FEW)))

const dayText = (date) => (date === addDays(props.today, -1) ? 'Yesterday' : formatDate(date))
function when(m) {
  if (m.task.period === 'day' || hasDue(m.task)) return dayText(m.fillDate)
  const { start } = m.period
  if (m.task.period === 'week') return `Week of ${formatShortDate(start)}`
  if (m.task.period === 'biweek') return `2 weeks from ${formatShortDate(start)}`
  if (m.task.period === 'month') return formatDate(start, { month: 'long' })
  return start.slice(0, 4)
}
// For counted goals: how far it got, e.g. "2 of 4" or "300 / 1,000 strokes".
function short(m) {
  const target = Number(m.task.target)
  if (target === 1 && m.task.unit_type === 'occurrence') return ''
  const done = target - m.missing
  const unit = m.task.unit_label ? ` ${m.task.unit_label}` : ''
  return m.task.unit_type === 'quantity' ? `${done.toLocaleString()} / ${target.toLocaleString()}${unit}` : `${done} of ${target}`
}

const busy = ref(false)
async function run(fn) {
  if (busy.value) return
  busy.value = true
  try {
    await fn()
  } finally {
    busy.value = false
  }
}
const didIt = (m) =>
  run(async () => {
    const before = state.completions.length
    await fillMiss(m.task, m)
    const added = state.completions.length - before
    showToast(`Logged ${m.task.name} for ${dayText(m.fillDate).replace('Yesterday', 'yesterday')}`, async () => {
      for (let i = 0; i < added; i++) await removeLastCompletion(m.task, m.fillDate)
    })
  })
const missedIt = (m) =>
  run(async () => {
    const before = [...(m.task.dismissed_misses ?? [])]
    await dismissMiss(m.task, m)
    showToast(`Kept ${m.task.name} as missed`, () => updateTask(m.task, { dismissed_misses: before }))
  })
</script>

<template>
  <section v-if="misses.length" class="missed" :class="{ open }">
    <button class="section-head head" :aria-expanded="open" @click="open = !open">
      <span><Icon name="chevron" class="chev" />Missed<b class="badge">{{ misses.length }}</b></span>
    </button>
    <TransitionGroup v-if="open" name="row" tag="div">
      <div v-for="m in shown" :key="m.task.id + m.period.start" class="miss">
        <button class="what" @click="emit('select', m.task.id)">
          <i class="dot" :class="m.task.kind"></i>
          <span class="name">{{ m.task.name }}</span>
          <span class="when">{{ when(m) }}<template v-if="short(m)"> · {{ short(m) }}</template></span>
        </button>
        <button class="btn small" :disabled="busy" @click="didIt(m)">Did it</button>
        <button class="btn small quiet" :disabled="busy" @click="missedIt(m)">Missed it</button>
      </div>
    </TransitionGroup>
    <button v-if="open && misses.length > FEW" class="more" @click="showAll = !showAll">
      {{ showAll ? 'Show fewer' : `Show ${misses.length - FEW} more` }}
    </button>
  </section>
</template>

<style scoped>
.head {
  width: 100%;
  border: 0;
  background: none;
  color: var(--late);
  cursor: pointer;
}
.head span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.chev {
  width: 13px;
  height: 13px;
  transition: transform 0.2s;
}
.missed.open .chev {
  transform: rotate(90deg);
}
.badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--late);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
}
.miss {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  border-bottom: 1px solid var(--border);
}
.miss:last-child {
  border-bottom: 0;
}
.what {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 0;
  border: 0;
  background: none;
  text-align: left;
}
.dot {
  flex: none;
  align-self: center;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.dot.habit {
  background: var(--habit);
}
.dot.chore {
  background: var(--chore);
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.when {
  flex: none;
  font-size: 0.8rem;
  color: var(--muted);
}
.quiet {
  color: var(--muted);
}
.more {
  margin: 6px 0 0;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--accent);
  font-size: 0.85rem;
  font-weight: 600;
}
@media (max-width: 600px) {
  .what {
    flex-direction: column;
    gap: 1px;
  }
  .dot {
    display: none;
  }
}
</style>
