<script setup>
import { ref, computed } from 'vue'
import { state, addCompletion, removeLastCompletion, recoverStreak, declineRecovery } from '../data/store.js'
import { periodFor, periodUnit } from '../domain/periods.js'
import { dailyTotals, sumRange } from '../domain/totals.js'
import { computeStreak, recoveryOffer } from '../domain/streak.js'
import { pinStatus } from '../domain/status.js'
import { isPausedOn, skipOn } from '../domain/pauses.js'
import Icon from './Icon.vue'
import RecoveryDialog from './RecoveryDialog.vue'
import SwipeRow from './SwipeRow.vue'
import { skipActionFor, toggleSkip } from '../lib/quickActions.js'

// One line on the Today list. The circle on the left logs it (a ring that fills for
// multi-step tasks); tapping anywhere else selects it to show details.
const props = defineProps({
  task: { type: Object, required: true },
  date: { type: String, required: true },
  today: { type: String, required: true },
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'done'])

const target = computed(() => Number(props.task.target))
const period = computed(() => periodFor(props.task, props.date))
const progress = computed(() => sumRange(dailyTotals(props.task, state.completions), period.value.start, props.date))
const met = computed(() => progress.value >= target.value)
const loggedOnDay = computed(() => state.completions.some((c) => c.task_id === props.task.id && c.date === props.date))
const simple = computed(() => props.task.unit_type === 'occurrence' && target.value === 1)

// Ring geometry: r = 9.5 → circumference ≈ 59.7
const CIRC = 59.7
const ringDash = computed(() => `${Math.min(1, progress.value / target.value) * CIRC} ${CIRC}`)

const fmt = (n) => Number(n).toLocaleString()
const progressText = computed(() => {
  if (simple.value) return ''
  const unit = props.task.unit_label ? ` ${props.task.unit_label}` : ''
  const when = { day: '', week: ' this week', biweek: ' these 2 weeks', month: ' this month', year: ' this year' }[props.task.period]
  return props.task.unit_type === 'quantity'
    ? `${fmt(progress.value)} / ${fmt(target.value)}${unit}${when}`
    : `${progress.value} of ${target.value}${when}`
})
const streak = computed(() => computeStreak(props.task, state.completions, state.pauses, state.vacations, props.today))
const status = computed(() => pinStatus(props.task, state.completions, props.date))
const dueText = computed(() => {
  const s = status.value
  if (!s || s.state === 'done') return ''
  return s.state === 'grace' ? s.label.replace('Due (grace until', 'Grace until').replace(')', '') : s.label
})
const skipped = computed(() => Boolean(skipOn(props.task, props.date, state.pauses)))
const paused = computed(() => isPausedOn(props.task, props.date, state.pauses, state.vacations))

// Logging, with the streak-recovery check when logging today.
const busy = ref(false)
const offer = ref(null)
async function toggle() {
  if (busy.value) return
  busy.value = true
  try {
    if (met.value && loggedOnDay.value) {
      await removeLastCompletion(props.task, props.date)
      return
    }
    await addCompletion(props.task, props.date)
    if (props.date === props.today) {
      offer.value = recoveryOffer(props.task, state.completions, state.pauses, state.vacations, props.today)
    }
    if (met.value) emit('done', props.task.id)
  } finally {
    busy.value = false
  }
}
// Skip (or unskip) this period: swipe left on a phone, or the button on hover.
const quick = computed(() => {
  const action = skipActionFor(props.task, props.date)
  if (action === 'skip') return { key: 'skip', label: 'Skip', icon: 'skip', tone: 'gray' }
  if (action === 'unskip') return { key: 'unskip', label: 'Unskip', icon: 'undo', tone: 'gray' }
  return null
})
const swipeActions = computed(() => (quick.value ? [quick.value] : []))
const runQuick = () => toggleSkip(props.task, props.date, props.today)
const fillMissed = () => recoverStreak(props.task, offer.value).finally(() => (offer.value = null))
const startFresh = () => declineRecovery(props.task, offer.value).finally(() => (offer.value = null))
</script>

<template>
  <SwipeRow :actions="swipeActions" @action="runQuick">
    <div class="row" :class="{ done: met, selected, dim: paused }" @click="emit('select', task.id)">
      <button
        class="check"
        :class="{ ring: !simple, full: met }"
        :aria-label="met && loggedOnDay ? `Undo ${task.name}` : `Log ${task.name}`"
        :disabled="busy"
        @click.stop="toggle"
      >
        <svg v-if="!simple && !met" viewBox="0 0 22 22" aria-hidden="true">
          <circle class="bg" cx="11" cy="11" r="9.5" />
          <circle v-if="progress > 0" class="fg" cx="11" cy="11" r="9.5" :stroke-dasharray="ringDash" />
        </svg>
        <Icon v-else name="check" class="tick" />
      </button>
      <div class="text">
        <span class="name">{{ task.name }}</span>
        <span class="meta">
          <span v-if="skipped" class="pill skipped">Skipped</span>
          <span v-else-if="paused" class="pill skipped">Paused</span>
          <span v-if="progressText">{{ progressText }}</span>
          <span v-if="dueText" class="due">{{ dueText }}</span>
          <span v-if="streak" class="streak"><Icon name="flame" />{{ streak }} {{ periodUnit(task, streak) }}</span>
        </span>
      </div>
      <button v-if="quick" class="quick" :title="`${quick.label} (S)`" :aria-label="`${quick.label} ${task.name}`" @click.stop="runQuick">
        <Icon :name="quick.icon" />
      </button>
      <RecoveryDialog v-if="offer" :task="task" :offer="offer" @fill="fillMissed" @decline="startFresh" />
    </div>
  </SwipeRow>
</template>

<style scoped>
.row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 0 -10px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: default;
}
@media (hover: hover) {
  .row:hover {
    background: var(--hover);
  }
}
.row.selected {
  background: var(--selected);
}
.row.dim .name,
.row.dim .check {
  opacity: 0.5;
}

/* The circle: round checkbox, or a ring that fills for multi-step tasks. */
.check {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-top: 0;
  padding: 0;
  border: 1.5px solid var(--faint);
  border-radius: 50%;
  background: none;
  color: #fff;
  transition: background 0.2s, border-color 0.2s, transform 0.12s;
}
.check.ring {
  border: 0;
}
.check:active {
  transform: scale(0.86);
}
.check.full {
  border-color: var(--accent);
  background: var(--accent);
}
.check svg {
  width: 22px;
  height: 22px;
}
.check .tick {
  width: 12px;
  height: 12px;
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  transition: stroke-dashoffset 0.25s 0.05s;
}
.check.full .tick {
  stroke-dashoffset: 0;
}
.check.ring:not(.full) .tick {
  display: none;
}
.bg,
.fg {
  fill: none;
  stroke-width: 2.2;
}
.bg {
  stroke: var(--track);
}
.fg {
  stroke: var(--accent);
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dasharray 0.35s;
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 12px;
}
.name {
  font-size: 1rem;
  line-height: 1.35;
  transition: color 0.3s;
}
.row.done .name {
  color: var(--muted);
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.82rem;
  color: var(--muted);
}
.meta:empty {
  display: none;
}
.meta > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.meta svg {
  width: 11px;
  height: 11px;
}
.due {
  color: var(--due);
}

/* Phones: details go on their own line under the name. Wide screens: same line, right-aligned. */
@media (max-width: 899px) {
  .text {
    flex-direction: column;
    gap: 2px;
  }
}
@media (min-width: 900px) {
  .meta {
    margin-left: auto;
  }
}
/* Desktop: a one-click action button appears at the row's right end on hover. */
.quick {
  display: none;
}
@media (hover: hover) {
  .row {
    position: relative;
  }
  .quick {
    position: absolute;
    top: 50%;
    right: 4px;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: inherit;
    color: var(--muted);
    transform: translateY(-50%);
    box-shadow: -14px 0 10px -4px var(--hover);
  }
  .row.selected .quick {
    box-shadow: -14px 0 10px -4px var(--selected);
  }
  .row:hover .quick {
    display: grid;
  }
  .quick:hover {
    color: var(--text);
  }
  .quick.danger:hover {
    color: var(--late);
  }
  .quick svg {
    width: 16px;
    height: 16px;
  }
}
/* Skipped / Paused: the same small gray label as in the detail panel. */
.skipped {
  padding: 0 6px;
  font-size: 0.7rem;
  line-height: 16px;
}
</style>
