<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signIn, signUp, startDemo } from '../data/session.js'

const router = useRouter()
const logo = `${import.meta.env.BASE_URL}icon.svg` // works on the Pages subpath too
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)
// 'signin' or 'signup' (new account). After signing up, `sent` holds the address the
// confirmation email went to, when the project asks for one.
const mode = ref('signin')
const sent = ref('')

function switchMode() {
  mode.value = mode.value === 'signin' ? 'signup' : 'signin'
  error.value = ''
  sent.value = ''
}

async function submit() {
  error.value = ''
  busy.value = true
  try {
    if (mode.value === 'signup') {
      if (!(await signUp(email.value.trim(), password.value))) {
        sent.value = email.value.trim()
        return
      }
    } else {
      await signIn(email.value.trim(), password.value)
    }
    router.replace('/')
  } catch (e) {
    error.value = friendly(e.message)
  } finally {
    busy.value = false
  }
}

function friendly(msg) {
  if (msg === 'Invalid login credentials') return 'Email or password is wrong.'
  if (msg === 'Email not confirmed') return 'Confirm your email first: open the link we sent you.'
  if (/signups? not allowed/i.test(msg)) return 'New accounts are turned off right now.'
  if (/password should be at least/i.test(msg)) return 'Use at least 6 characters for the password.'
  return msg
}

async function demo() {
  await startDemo()
  router.replace('/')
}
</script>

<template>
  <main class="login">
    <img :src="logo" alt="" class="logo" />
    <h1>Upkeep</h1>

    <div v-if="sent" class="panel sent">
      <p>Almost done. We sent a link to <b>{{ sent }}</b>. Open it to confirm your email and you'll be signed in.</p>
      <button class="btn wide" @click="switchMode">Back to sign in</button>
    </div>

    <form v-else class="panel" @submit.prevent="submit">
      <label class="field">
        <span class="label">Email</span>
        <input v-model="email" type="email" class="input" autocomplete="username" required />
      </label>
      <label class="field">
        <span class="label">Password</span>
        <input
          v-model="password"
          type="password"
          class="input"
          :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'"
          :minlength="mode === 'signup' ? 6 : null"
          required
        />
        <span v-if="mode === 'signup'" class="hint">At least 6 characters</span>
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button v-if="mode === 'signin'" type="submit" class="btn primary wide" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
      <button v-else type="submit" class="btn primary wide" :disabled="busy">{{ busy ? 'Creating account…' : 'Create account' }}</button>
      <p class="switch">
        {{ mode === 'signin' ? 'New here?' : 'Already have an account?' }}
        <button type="button" class="link" @click="switchMode">{{ mode === 'signin' ? 'Create an account' : 'Sign in' }}</button>
      </p>
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
.logo {
  display: block;
  width: 72px;
  height: 72px;
  margin: 0 auto 12px;
  border-radius: 18px;
  box-shadow: var(--shadow);
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
.hint {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--muted);
}
.switch {
  margin: 12px 0 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--muted);
}
.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.sent p {
  margin: 0 0 12px;
  line-height: 1.45;
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
