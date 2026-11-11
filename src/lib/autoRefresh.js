import { refreshStore } from '../data/store.js'

// Keeps devices in step: changes made elsewhere (checked off at work, say) show up
// when you come back to the window, and every couple of minutes while it's open.
// Skipped while you're typing, so nothing you're editing gets swapped out.
const EVERY = 2 * 60 * 1000
const MIN_GAP = 15 * 1000 // focus and visibility often fire together

let last = Date.now()

function typing() {
  const el = document.activeElement
  return el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

async function refresh() {
  if (document.hidden || typing() || Date.now() - last < MIN_GAP) return
  last = Date.now()
  try {
    await refreshStore()
  } catch {
    // Offline or a hiccup: keep what's on screen and try again next time.
  }
}

export function startAutoRefresh() {
  document.addEventListener('visibilitychange', refresh)
  window.addEventListener('focus', refresh)
  setInterval(refresh, EVERY)
}
