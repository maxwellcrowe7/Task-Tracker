<script setup>
// Small line icons used across the app. Stroke icons follow currentColor.
defineProps({ name: { type: String, required: true } })
</script>

<template>
  <svg v-if="name === 'star'" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="var(--star)" d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" />
  </svg>
  <svg v-else-if="name === 'flame'" viewBox="0 0 12 12" aria-hidden="true">
    <path fill="var(--flame)" d="M6 .5c.6 2 3 3 3 5.9A3 3 0 0 1 3 6.4c0-1.4.7-2.2 1.3-3 .2 1 .6 1.5 1.2 1.8C5.2 3.4 5.5 2 6 .5z" />
  </svg>
  <svg v-else-if="name === 'routines'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" />
  </svg>
  <svg v-else-if="name === 'inbox'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 13h4l2 3h4l2-3h4" /><path d="M5.5 5h13L21 13v6H3v-6z" />
  </svg>
  <svg v-else-if="name === 'flag'" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor">
    <path d="M2.5 1.2v10M2.5 1.6h6.6L7.6 4l1.5 2.4H2.5" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
  </svg>
  <svg v-else-if="name === 'calendar'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
  <svg v-else-if="name === 'notes'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M5 6h14M5 12h14M5 18h9" />
  </svg>
  <svg v-else-if="name === 'steps'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 6.5l1.6 1.5L8.5 5M4 15.5l1.6 1.5 2.9-3M12 7h8M12 16h8" />
  </svg>
  <svg v-else-if="name === 'tag'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" fill="currentColor" />
  </svg>
  <svg v-else-if="name === 'plus'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
  <svg v-else-if="name === 'settings'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" />
  </svg>
  <svg v-else-if="name === 'check'" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2.5 6.5l2.3 2.2 4.7-5" />
  </svg>
  <svg v-else-if="name === 'trash'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 7h16M10 3.5h4M6 7l1 13h10l1-13M10 11v5M14 11v5" />
  </svg>
  <svg v-else-if="name === 'skip'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 5l9 7-9 7zM18 5v14" />
  </svg>
  <svg v-else-if="name === 'undo'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
  <svg v-else-if="name === 'close'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
  <svg v-else-if="name === 'chevron'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
</template>
