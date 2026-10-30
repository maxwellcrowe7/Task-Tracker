<script setup>
import { ref, onMounted } from 'vue'
import TagManager from './TagManager.vue'
import Icon from './Icon.vue'

// "Edit tags" from the sidebar: every tag on one screen.
const emit = defineEmits(['close'])
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
    <dialog ref="dialog" class="tags-dialog" autofocus @close="emit('close')" @click="onClick">
      <header>
        <h2>Tags</h2>
        <button class="close" aria-label="Close" @click="dialog.close()"><Icon name="close" /></button>
      </header>
      <TagManager />
    </dialog>
  </Teleport>
</template>

<style scoped>
.tags-dialog {
  width: min(640px, calc(100vw - 32px));
  max-height: calc(100vh - 64px);
  padding: 18px 20px 20px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 20px 50px rgb(0 0 0 / 0.3);
}
.tags-dialog::backdrop {
  background: rgb(0 0 0 / 0.35);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
h2 {
  margin: 0;
  font-size: 1.15rem;
}
.close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--muted);
}
.close:hover {
  background: var(--hover);
  color: var(--text);
}
.close svg {
  width: 14px;
  height: 14px;
}
</style>
