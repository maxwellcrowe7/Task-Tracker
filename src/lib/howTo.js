import { reactive } from 'vue'

// The "How Upkeep works" walkthrough: opened from the sidebar's ? button or Settings,
// and once on its own for a brand-new account.
const KEY = 'upkeep-howto-seen'

export const howTo = reactive({ open: false })

export function seenHowTo() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true // no storage: don't keep popping it up
  }
}

export function markHowToSeen() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {}
}
