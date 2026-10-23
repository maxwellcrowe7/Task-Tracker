<script setup>
// A row of mutually exclusive buttons, e.g. Habit | Chore.
const model = defineModel({ required: true })
defineProps({
  options: { type: Array, required: true }, // [{ value, label }]
  label: { type: String, required: true },
})
</script>

<template>
  <div class="segmented" role="radiogroup" :aria-label="label">
    <button
      v-for="o in options"
      :key="String(o.value)"
      type="button"
      role="radio"
      :aria-checked="model === o.value"
      :class="{ on: model === o.value }"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: flex;
  padding: 3px;
  gap: 3px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--neutral-soft);
}
button {
  flex: 1;
  min-height: 38px;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--muted);
  font-weight: 600;
}
button.on {
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
}
</style>
