<script setup>
import { computed } from 'vue'
import { state } from '../data/store.js'
import { signOut } from '../data/session.js'
import { themeSettings } from '../lib/theme.js'
import Segmented from '../components/Segmented.vue'
import TagManager from '../components/TagManager.vue'

const modeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
]
const modeHelp = computed(
  () =>
    ({
      light: 'Always light.',
      dark: 'Always dark.',
      auto: 'Dark between the times below, light the rest of the day.',
    })[themeSettings.mode] ?? ''
)
</script>

<template>
  <div class="page">
  <h1 class="page-title title">Settings</h1>

  <section class="panel">
    <h2>Appearance</h2>
    <div class="field">
      <Segmented v-model="themeSettings.mode" :options="modeOptions" label="Appearance" />
      <span class="help">{{ modeHelp }}</span>
    </div>
    <div v-if="themeSettings.mode === 'auto'" class="pair">
      <label class="field">
        <span class="label">Dark from</span>
        <input v-model="themeSettings.darkFrom" type="time" class="input" />
      </label>
      <label class="field">
        <span class="label">Until</span>
        <input v-model="themeSettings.darkUntil" type="time" class="input" />
      </label>
    </div>
    <p class="note">Saved on this device only.</p>
  </section>

  <section class="panel">
    <h2>Tags</h2>
    <TagManager />
  </section>

  <section class="panel">
    <h2>Account</h2>
    <template v-if="state.demo">
      <p class="sub">You're looking at sample data. Nothing is saved.</p>
      <button class="btn" @click="signOut">Exit demo</button>
    </template>
    <template v-else>
      <p class="sub">Signed in as {{ state.email }}</p>
      <button class="btn" @click="signOut">Sign out</button>
    </template>
  </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 620px;
  margin: 0 auto;
}
@media (min-width: 900px) {
  .page {
    padding: 34px 40px 80px;
  }
}
.title {
  margin: 4px 0 14px;
  font-size: 1.5rem;
}
.panel + .panel {
  margin-top: 12px;
}
h2 {
  margin: 0 0 10px;
  font-size: 1rem;
}
.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 10px;
}
.note,
.sub {
  margin: 0 0 10px;
  font-size: 0.8rem;
  color: var(--muted);
}
.note {
  margin: 0;
}
</style>
