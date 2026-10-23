<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signIn, startDemo } from '../data/session.js'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await signIn(email.value.trim(), password.value)
    router.replace('/')
  } catch (e) {
    error.value = e.message === 'Invalid login credentials' ? 'Email or password is wrong.' : e.message
  } finally {
    busy.value = false
  }
}

async function demo() {
  await startDemo()
  router.replace('/')
}
</script>

<template>
  <main class="login">
    <h1>Habit Tracker</h1>

    <form class="panel" @submit.prevent="submit">
      <label class="field">
        <span class="label">Email</span>
        <input v-model="email" type="email" class="input" autocomplete="username" required />
      </label>
      <label class="field">
        <span class="label">Password</span>
        <input v-model="password" type="password" class="input" autocomplete="current-password" required />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit" class="btn primary wide" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
    </form>

    <button class="btn wide demo" @click="demo">Load sample data</button>
    <p class="note">Sample data isn't saved anywhere and resets when you reload.</p>
  </main>
</template>

<style scoped>
.login {
  max-width: 380px;
  margin: 8vh auto 0;
}
h1 {
  margin: 0 0 16px;
  text-align: center;
  font-size: 1.6rem;
}
.wide {
  width: 100%;
}
.error {
  margin: -4px 0 12px;
  font-size: 0.85rem;
  color: #c0392b;
}
.demo {
  margin-top: 16px;
}
.note {
  margin: 8px 0 0;
  text-align: center;
  font-size: 0.8rem;
  color: var(--muted);
}
</style>
