import { refreshStore } from '../data/store.js'
import { supabase } from './supabase.js'

// Keeps devices in step: changes made elsewhere (checked off at work, say) show up
// right away when Supabase announces them, when you come back to the window, and
// every couple of minutes as a fallback. Waits while you're typing, so nothing
// you're editing gets swapped out.
const EVERY = 2 * 60 * 1000
const MIN_GAP = 15 * 1000 // focus and visibility often fire together

// Tables whose changes should reach other open copies of the app.
const TABLES = ['habit_tasks', 'habit_completions', 'habit_pauses', 'habit_vacations', 'habit_todos', 'habit_tags']

let last = Date.now()
let soon = null

function typing() {
  const el = document.activeElement
  return el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

async function refresh({ now = false } = {}) {
  if (document.hidden || typing() || (!now && Date.now() - last < MIN_GAP)) return
  last = Date.now()
  try {
    await refreshStore()
  } catch {
    // Offline or a hiccup: keep what's on screen and try again next time.
  }
}

// A change came in: reload shortly (one reload covers a burst of changes), or once
// you've stopped typing.
function changed() {
  clearTimeout(soon)
  soon = setTimeout(() => (typing() ? changed() : refresh({ now: true })), typing() ? 3000 : 600)
}

export function startAutoRefresh() {
  document.addEventListener('visibilitychange', () => refresh())
  window.addEventListener('focus', () => refresh())
  setInterval(refresh, EVERY)
}

// Live updates, once signed in. Only your own rows come through (row-level security).
// Does nothing until the tables are added to Supabase's realtime list.
export function startLiveUpdates() {
  if (!supabase) return
  const channel = supabase.channel('upkeep-sync')
  for (const table of TABLES) channel.on('postgres_changes', { event: '*', schema: 'public', table }, changed)
  channel.subscribe()
}
