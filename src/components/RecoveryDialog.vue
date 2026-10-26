<script setup>
import { computed, ref, onMounted } from 'vue'
import { periodUnit } from '../domain/periods.js'
import { formatDate, formatShortDate } from '../lib/format.js'

// Asks whether to fill in a single missed period to keep a streak alive.
const props = defineProps({
  task: { type: Object, required: true },
  offer: { type: Object, required: true },
})
const emit = defineEmits(['fill', 'decline'])

const dialog = ref(null)
onMounted(() => dialog.value.showModal())

const { period } = props.offer
const missedLabel = computed(
  () =>
    ({
      day: formatDate(period.start),
      week: `the week of ${formatShortDate(period.start)}`,
      biweek: `the 2 weeks from ${formatShortDate(period.start)}`,
      month: formatDate(period.start, { month: 'long', year: 'numeric' }),
      year: period.start.slice(0, 4),
    })[props.task.period],
)
const fillLabel = computed(() =>
  props.task.period === 'day' ? formatShortDate(period.start) : props.task.period === 'year' ? period.start.slice(0, 4) : 'it',
)
// "119-day", "6-week", "3-month"
const streakText = computed(() => `${props.offer.streak}-${periodUnit(props.task, 1)}`)
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="recovery" @cancel.prevent>
      <p class="icon" aria-hidden="true">🔥</p>
      <h2>Your {{ streakText }} streak ended</h2>
      <p>
        <strong>{{ task.name }}</strong> wasn't completed for {{ missedLabel }}. Did you do it and forget to log
        it?
      </p>
      <div class="buttons">
        <button class="btn primary" @click="emit('fill')">Yes, fill in {{ fillLabel }}</button>
        <button class="btn" @click="emit('decline')">No, start fresh</button>
      </div>
      <p class="note">If you start fresh, you won't be asked about this again.</p>
    </dialog>
  </Teleport>
</template>

<style scoped>
.recovery {
  width: min(360px, calc(100vw - 32px));
  padding: 22px 20px 18px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 20px 50px rgb(0 0 0 / 0.35);
  text-align: center;
}
.recovery::backdrop {
  background: rgb(0 0 0 / 0.45);
}
.icon {
  margin: 0;
  font-size: 2rem;
}
h2 {
  margin: 6px 0 8px;
  font-size: 1.15rem;
}
p {
  margin: 0;
  line-height: 1.45;
}
.buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 18px;
}
.note {
  margin-top: 10px;
  font-size: 0.78rem;
  color: var(--muted);
}
</style>
