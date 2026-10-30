<script setup>
import { todayLocal } from '../domain/dates.js'
import TaskDetail from '../components/TaskDetail.vue'

// Phone detail page (on desktop the same details open in the Today side panel).
defineProps({ id: { type: String, required: true } })
const today = todayLocal()
</script>

<template>
  <div class="page">
    <router-link to="/" class="back">‹ Today</router-link>
    <TaskDetail :id="id" :today="today" />
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
  display: inline-block;
  margin-bottom: 10px;
  padding: 4px 0;
  font-weight: 600;
  text-decoration: none;
}
</style>
