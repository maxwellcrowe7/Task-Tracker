<script setup>
import { PALETTE } from '../domain/tags.js'

// The grid of tag colors to pick from.
const model = defineModel({ type: String, default: null })
</script>

<template>
  <div class="color-grid" role="radiogroup" aria-label="Color">
    <button
      v-for="c in PALETTE"
      :key="c.id"
      type="button"
      class="swatch"
      role="radio"
      :aria-checked="c.id === model"
      :class="{ on: c.id === model }"
      :style="{ background: c.bg, borderColor: c.fg }"
      :aria-label="c.id"
      :title="c.id"
      @mousedown.prevent
      @click="model = c.id"
    ></button>
  </div>
</template>

<style scoped>
.color-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}
.swatch {
  aspect-ratio: 1;
  min-width: 0;
  padding: 0;
  border: 2px solid;
  border-radius: 6px;
}
.swatch.on {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
</style>
