<script setup>
import { computed } from 'vue'
import { state } from '../data/store.js'
import { addDays, dayOfWeek, WEEKDAY_SHORT } from '../domain/dates.js'
import { periodFor } from '../domain/periods.js'
import { dailyTotals, sumRange } from '../domain/totals.js'
import { isPausedOn } from '../domain/pauses.js'
import { upcomingItems } from '../domain/upcoming.js'
import { formatShortDate } from '../lib/format.js'
import { context } from '../lib/context.js'

// The right-hand panel on wide screens when no task is open: this week's history for
// every routine at a glance, and what's coming up. Neutral marks only, no judging colors.
const props = defineProps({
  date: { type: String, required: true },
  today: { type: String, required: true },
})
const emit = defineEmits(['select', 'select-todo'])

const weekStart = computed(() => addDays(props.date, -dayOfWeek(props.date)))
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i)))
const weekEnd = computed(() => days.value[6])

const routines = computed(() =>
  state.tasks
    .filter((t) => t.active && t.scope === context.scope && t.active_since <= weekEnd.value)
    .sort((a, b) => (a.kind === b.kind ? a.sort_order - b.sort_order : a.kind === 'habit' ? -1 : 1)),
)

// "300/1k" rather than "300/1,000" so big targets fit.
const short = (n) => Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)

const rows = computed(() =>
  routines.value.map((task) => {
    const totals = dailyTotals(task, state.completions)
    const target = Number(task.target)
    const cells = days.value.map((d) => {
      if (d > props.today || d < task.active_since) return 'future'
      const amount = totals.get(d) ?? 0
      if (amount === 0) return isPausedOn(task, d, state.pauses, state.vacations) ? 'paused' : 'none'
      return task.period === 'day' && amount < target ? 'part' : 'full'
    })
    let tally = ''
    if (task.period !== 'day') {
      const p = periodFor(task, props.date)
      tally = `${short(sumRange(totals, p.start, p.end))}/${short(target)}`
    }
    return { task, cells, tally }
  }),
)

// Routines due in the next 7 days plus dated to-dos, soonest first.
const coming = computed(() => {
  const routines = upcomingItems(state.tasks.filter((t) => t.scope === context.scope), state.completions, props.today, 7)
    .map((i) => ({ key: `r${i.task.id}${i.date}`, date: i.date, name: i.task.name, id: i.task.id, todo: false }))
  const todos = state.todos
    .filter((t) => t.scope === context.scope && !t.done_on && t.due_date > props.today && t.due_date <= addDays(props.today, 7))
    .map((t) => ({ key: `t${t.id}`, date: t.due_date, name: t.title, id: t.id, todo: true }))
  // Dated steps inside open to-dos, labeled with their to-do.
  const steps = state.todos
    .filter((t) => t.scope === context.scope && !t.done_on)
    .flatMap((t) =>
      (t.steps ?? [])
        .filter((s) => !s.done && s.due_date > props.today && s.due_date <= addDays(props.today, 7))
        .map((s) => ({ key: `s${s.id}`, date: s.due_date, name: s.text, parent: t.title, id: t.id, todo: true })),
    )
  return [...routines, ...todos, ...steps].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
})
const when = (date) => {
  if (date === addDays(props.today, 1)) return 'Tomorrow'
  if (date <= addDays(props.today, 6)) return WEEKDAY_SHORT[dayOfWeek(date)]
  return formatShortDate(date)
}
</script>

<template>
  <div class="overview">
    <section>
      <h2 class="section-head">This week</h2>
      <div class="grid head-row">
        <span></span>
        <span v-for="(d, i) in days" :key="d" class="dh" :class="{ now: d === today }">{{ 'SMTWTFS'[i] }}</span>
        <span></span>
      </div>
      <button v-for="r in rows" :key="r.task.id" class="grid row" @click="emit('select', r.task.id)">
        <span class="name">{{ r.task.name }}</span>
        <span v-for="(c, i) in r.cells" :key="i" class="cell" :class="c"><i></i></span>
        <span class="tally">{{ r.tally }}</span>
      </button>
      <p v-if="!rows.length" class="empty">No routines yet.</p>
    </section>

    <section>
      <h2 class="section-head">Coming up</h2>
      <button v-for="item in coming" :key="item.key" class="soon" @click="emit(item.todo ? 'select-todo' : 'select', item.id)">
        <span class="when">{{ when(item.date) }}</span>
        <span class="name">{{ item.name }}<small v-if="item.parent" class="parent"> · {{ item.parent }}</small></span>
      </button>
      <p v-if="!coming.length" class="empty">Nothing due in the next week.</p>
    </section>
  </div>
</template>

<style scoped>
.overview section + section {
  margin-top: 8px;
}
.overview .section-head {
  margin-top: 4px;
}
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(7, 22px) 52px;
  align-items: center;
  gap: 4px;
}
.head-row {
  padding: 6px 8px 2px;
}
.dh {
  text-align: center;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--muted);
}
.dh.now {
  color: var(--accent);
}
.row {
  width: calc(100% + 0px);
  margin: 0;
  padding: 6px 8px;
  border: 0;
  border-radius: 7px;
  background: none;
  text-align: left;
}
.row:hover,
.soon:hover {
  background: var(--hover);
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.87rem;
}
.cell {
  display: grid;
  place-items: center;
  height: 18px;
}
.cell i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--track);
}
.cell.full i {
  width: 11px;
  height: 11px;
  background: var(--accent);
}
.cell.part i {
  background: color-mix(in srgb, var(--accent) 45%, transparent);
}
.cell.paused i {
  width: 9px;
  height: 2px;
  border-radius: 1px;
}
.cell.future i {
  background: none;
  border: 1.5px solid var(--faint);
  width: 9px;
  height: 9px;
}
.tally {
  text-align: right;
  font-size: 0.75rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.soon {
  display: flex;
  gap: 12px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: 7px;
  background: none;
  text-align: left;
}
.when {
  flex: none;
  width: 70px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--due);
}
.parent {
  color: var(--muted);
  font-size: 0.8rem;
}
.empty {
  margin: 10px 8px;
  font-size: 0.85rem;
  color: var(--muted);
}
</style>
