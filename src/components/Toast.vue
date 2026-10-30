<script setup>
import { toast, hideToast } from '../lib/toast.js'

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
      <button v-if="toast.undo" @click="undo">Undo</button>
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
  gap: 16px;
  max-width: calc(100vw - 32px);
  padding: 10px 12px 10px 16px;
  border-radius: 10px;
  border: 1px solid rgb(255 255 255 / 0.14);
  background: #2c2c2e;
  color: #fff;
  font-size: 0.9rem;
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.2);
  transform: translateX(-50%);
}
.toast span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
button {
  flex: none;
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
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
