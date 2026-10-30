<script setup>
import { useRouter } from 'vue-router'
import { todayLocal } from '../domain/dates.js'
import TodoDetail from '../components/TodoDetail.vue'

// Phone detail page for a to-do (on desktop it opens in the side panel).
defineProps({ id: { type: String, required: true } })
const router = useRouter()
const today = todayLocal()
</script>

<template>
  <div class="page">
    <button class="back" @click="router.back()">‹ Back</button>
    <TodoDetail :id="id" :today="today" @deleted="router.back()" />
  </div>
</template>

<style scoped>
.page {
  max-width: 560px;
  margin: 0 auto;
}
@media (min-width: 900px) {
  .page {
    padding: 28px 40px 60px;
  }
}
.back {
  margin-bottom: 10px;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--accent);
  font-weight: 600;
}
</style>
