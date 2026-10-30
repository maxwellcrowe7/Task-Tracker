<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import Icon from './Icon.vue'

// Swipe a row left (touch screens only) to reveal buttons behind it, like Mail.
// `actions` = [{ key, label, icon, tone }], tone 'red' or 'gray'. A half swipe leaves
// the buttons showing; a long swipe runs the last one straight away. Only one row is
// open at a time; tapping anywhere else closes it. No actions, no swipe.
const props = defineProps({ actions: { type: Array, required: true } })
const emit = defineEmits(['action'])

const BTN = 74
const width = computed(() => props.actions.length * BTN)
const x = ref(0) // 0 closed, -width open
const dragging = ref(false)
const full = ref(false) // dragged far enough that letting go runs the action
const me = Symbol()
const content = ref(null)
const rowWidth = () => content.value?.offsetWidth ?? 360

let start = null // { x, y, base }
let moved = false

function down(e) {
  if (e.pointerType !== 'touch' || !props.actions.length) return
  start = { x: e.clientX, y: e.clientY, base: x.value }
  moved = false
}
function move(e) {
  if (!start) return
  const dx = e.clientX - start.x
  if (!dragging.value) {
    if (Math.abs(dx) < 8) return
    if (Math.abs(e.clientY - start.y) > Math.abs(dx)) return (start = null) // a scroll, not a swipe
    dragging.value = true
    moved = true
    openRow.value = me
  }
  // Rubber-band a little to the right; to the left the button stretches with you.
  const next = start.base + dx
  x.value = next > 0 ? next / 4 : Math.max(next, -rowWidth())
  const isFull = -x.value > Math.max(width.value + 40, rowWidth() * 0.55)
  if (isFull && !full.value) navigator.vibrate?.(8)
  full.value = isFull
}
function up() {
  if (!start) return
  start = null
  if (!dragging.value) return
  dragging.value = false
  if (full.value) {
    full.value = false
    x.value = -rowWidth()
    const last = props.actions.at(-1)
    setTimeout(() => pick(last.key), 180)
    return
  }
  x.value = x.value < -width.value / 2 ? -width.value : 0
  if (!x.value) openRow.value = null
}
// A swipe (or a tap while open) shouldn't also select the row.
function click(e) {
  if (!moved && !x.value) return
  e.stopPropagation()
  e.preventDefault()
  if (!moved) close()
}
function close() {
  x.value = 0
  if (openRow.value === me) openRow.value = null
}
function pick(key) {
  close()
  emit('action', key)
}

watch(openRow, (id) => id !== me && !dragging.value && (x.value = 0))
const outside = (e) => !root.value?.contains(e.target) && close()
const root = ref(null)
watch(
  () => x.value < 0,
  (open) => (open ? document.addEventListener('pointerdown', outside) : document.removeEventListener('pointerdown', outside)),
)
onUnmounted(() => {
  document.removeEventListener('pointerdown', outside)
  if (openRow.value === me) openRow.value = null
})
</script>

<script>
import { ref as vueRef } from 'vue'
const openRow = vueRef(null)
</script>

<template>
  <div ref="root" class="swipe" :class="{ open: x < 0 }">
    <div class="actions" :class="{ full }" :style="{ width: `${Math.max(width, -x)}px` }" :aria-hidden="x === 0">
      <button v-for="a in actions" :key="a.key" class="act" :class="a.tone" :tabindex="x < 0 ? 0 : -1" @click="pick(a.key)">
        <Icon :name="a.icon" />
        {{ a.label }}
      </button>
    </div>
    <div
      ref="content"
      class="content"
      :class="{ dragging }"
      :style="{ transform: x ? `translateX(${x}px)` : null }"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
      @click.capture="click"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.swipe {
  position: relative;
  margin: 0 -10px;
  border-radius: 8px;
  overflow: hidden;
}
.actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  visibility: hidden;
}
.swipe.open .actions,
.swipe:has(.content.dragging) .actions {
  visibility: visible;
}
.act {
  flex: 1;
  transition: padding 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0;
  border: 0;
  border-radius: 0;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 500;
}
.act :deep(svg) {
  width: 18px;
  height: 18px;
}
.actions.full .act:not(:last-child) {
  display: none;
}
.actions.full .act {
  align-items: flex-start;
  padding-left: 22px;
}
.act.red {
  background: var(--late);
}
.act.gray {
  background: var(--muted);
}
.content {
  position: relative;
  background: var(--bg);
  touch-action: pan-y;
  transition: transform 0.22s ease;
}
.content.dragging {
  transition: none;
}
.content > :deep(.row) {
  margin: 0;
}
</style>
