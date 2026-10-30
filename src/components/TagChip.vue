<script setup>
import { computed } from 'vue'
import { paletteColor } from '../domain/tags.js'

// A small colored label for a tag. Light mode uses the palette as-is; dark mode
// darkens the background and uses the pastel as text.
const props = defineProps({
  tag: { type: Object, required: true },
  on: { type: Boolean, default: true }, // false = outlined (not applied), for toggles
})
const color = computed(() => paletteColor(props.tag.color))
</script>

<template>
  <span class="tag-chip" :class="{ off: !on }" :style="{ '--tag-bg': color.bg, '--tag-fg': color.fg }">{{ tag.name }}</span>
</template>

<style scoped>
.tag-chip {
  display: inline-flex;
  align-items: center;
  max-width: 160px;
  padding: 0 7px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: var(--tag-bg);
  color: var(--tag-fg);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tag-chip.off {
  border-color: var(--border);
  background: none;
  color: var(--muted);
}
:root[data-theme='dark'] .tag-chip:not(.off) {
  background: color-mix(in srgb, var(--tag-fg) 55%, #1c1c1e);
  color: var(--tag-bg);
}
</style>
