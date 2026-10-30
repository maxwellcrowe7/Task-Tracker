<script setup>
import { toast, hideToast } from '../lib/toast.js'

// Acts on touch-down, not click: phones sometimes swallow the first tap on a
// freshly shown bar. The click fallback (keyboard) is a no-op once it has run.
function undo() {
  const fn = toast.undo
  hideToast()
  fn?.()
}
</script>

<template>
  <Transition name="toast">
    <div v-if="toast.text" :key="toast.id" class="toast" role="status">
      <span>{{ toast.text }}</span>
      <button v-if="toast.undo" @pointerdown.prevent="undo" @click="undo">Undo</button>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  z-index: 70;
  left: 50%;
  bottom: calc(76px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100vw - 32px);
  padding: 0 0 0 16px;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid rgb(255 255 255 / 0.14);
  background: #2c2c2e;
  color: #fff;
  min-height: 48px;
  font-size: 0.9rem;
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.2);
  transform: translateX(-50%);
}
.toast span {
  padding: 12px 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
button {
  flex: none;
  align-self: stretch;
  min-width: 76px;
  min-height: 48px;
  padding: 0 18px;
  border: 0;
  border-left: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 0;
  font-size: 0.95rem;
  background: none;
  color: #ffd60a;
  font-weight: 600;
}
@media (min-width: 900px) {
  .toast {
    bottom: 24px;
  }
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
