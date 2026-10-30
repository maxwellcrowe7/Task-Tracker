<script setup>
import { context } from '../lib/context.js'
</script>

<template>
  <div class="ctx" role="radiogroup" aria-label="Personal or work">
    <button
      v-for="side in ['personal', 'work']"
      :key="side"
      role="radio"
      :aria-checked="context.scope === side"
      :class="{ on: context.scope === side }"
      @click="context.scope = side"
    >
      {{ side === 'personal' ? 'Personal' : 'Work' }}
    </button>
  </div>
</template>

<style scoped>
.ctx {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  border-radius: 9px;
  background: var(--ctx-bg, var(--raised));
}
button {
  padding: 6px 0;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--muted);
  font-size: 0.87rem;
  font-weight: 600;
}
button.on {
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
}
</style>
