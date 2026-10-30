<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import TagChip from './TagChip.vue'
import TagEditPop from './TagEditPop.vue'

// A tag's chip that opens the name/color editor when clicked.
const props = defineProps({ tag: { type: Object, required: true } })
const router = useRouter()

const open = ref(false)
const btn = ref(null)
const pop = ref(null)
const toggle = () => (open.value ? pop.value?.close() : (open.value = true))
// Switching tags in the sidebar while the editor is open closes it.
watch(() => props.tag.id, () => (open.value = false))
</script>

<template>
  <button ref="btn" class="chip-btn" :aria-expanded="open" title="Edit tag" @click="toggle">
    <TagChip :tag="tag" class="big" />
  </button>
  <TagEditPop v-if="open" ref="pop" :tag="tag" :anchor="btn" @close="open = false" @deleted="router.push('/todos')" />
</template>

<style scoped>
.chip-btn {
  display: inline-flex;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  cursor: pointer;
}
.chip-btn:hover .big {
  box-shadow: 0 0 0 2px var(--hover);
}
.big {
  font-size: 0.95rem;
  line-height: 26px;
  padding: 0 10px;
  max-width: none;
}
</style>
