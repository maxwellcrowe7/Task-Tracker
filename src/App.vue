<script setup>
import { onMounted, onUnmounted } from 'vue'
import { state } from './data/store.js'
import { isConfigured, signOut } from './data/session.js'

// Any failed save (e.g. offline) shows a banner instead of failing silently.
const onFailure = (event) => {
  state.error = `Couldn't save that: ${event.reason?.message ?? event.reason}`
}
onMounted(() => window.addEventListener('unhandledrejection', onFailure))
onUnmounted(() => window.removeEventListener('unhandledrejection', onFailure))
</script>

<template>
  <div class="app">
    <p v-if="state.error" class="error-banner" role="alert">
      {{ state.error }}
      <button aria-label="Dismiss" @click="state.error = ''">✕</button>
    </p>
    <p v-if="state.demo" class="demo-banner">
      Demo mode · sample data · changes reset when you reload
      <button v-if="isConfigured" class="link" @click="signOut">Exit</button>
    </p>
    <router-view :key="$route.fullPath" />
  </div>
  <nav v-if="state.ready" class="tabs">
    <router-link to="/" class="tab" exact-active-class="on">Today</router-link>
    <router-link to="/manage" class="tab" active-class="on">Manage</router-link>
    <router-link to="/settings" class="tab" active-class="on">Settings</router-link>
  </nav>
</template>

<style scoped>
.app {
  max-width: 560px;
  margin: 0 auto;
  padding: 12px 16px calc(88px + env(safe-area-inset-bottom));
}
.demo-banner {
  margin: 0 0 12px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--neutral-soft);
  color: var(--muted);
  font-size: 0.8rem;
  text-align: center;
}
.demo-banner .link {
  margin-left: 4px;
  padding: 0;
  border: none;
  background: none;
  color: var(--habit);
  font-size: inherit;
  font-weight: 600;
}
.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #fbe3e0;
  color: #8a2219;
  font-size: 0.85rem;
}
.error-banner button {
  border: none;
  background: none;
  color: inherit;
  font-size: 1rem;
}
.tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px calc(8px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}
.tab {
  position: relative;
  flex: 1;
  max-width: 160px;
  padding: 12px 0;
  border-radius: 10px;
  text-align: center;
  text-decoration: none;
  font-weight: 600;
  color: var(--muted);
}
.tab.on {
  background: var(--brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.tab.on::after {
  content: '';
  position: absolute;
  left: 30%;
  right: 30%;
  bottom: 4px;
  height: 3px;
  border-radius: 999px;
  background: var(--brand);
}
</style>
