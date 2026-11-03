<script setup>
import { ref, onMounted } from 'vue'
import { todayLocal } from '../domain/dates.js'
import TaskDetail from './TaskDetail.vue'

// A routine's calendar and stats in a window over the edit form ("Calendar" button).
defineProps({ id: { type: String, required: true } })
const emit = defineEmits(['close'])
const today = todayLocal()
const dialog = ref(null)
onMounted(() => dialog.value.showModal())
// Clicking the dimmed backdrop (outside the box) closes it.
function onClick(e) {
  const r = dialog.value.getBoundingClientRect()
  if (e.target === dialog.value && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.value.close()
}
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="peek" autofocus @close="emit('close')" @click="onClick">
      <TaskDetail :id="id" :today="today" closable :editable="false" @close="dialog.close()" />
    </dialog>
  </Teleport>
</template>

<style scoped>
.peek {
  width: min(480px, calc(100vw - 32px));
  max-height: calc(100vh - 64px);
  padding: 22px 24px 24px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 20px 50px rgb(0 0 0 / 0.3);
}
.peek::backdrop {
  background: rgb(0 0 0 / 0.35);
}
</style>
