import { reactive } from 'vue'
import { todayLocal } from '../domain/dates.js'

// Today's date, kept current while the app stays open: checked every 30 seconds and
// whenever you come back to the window (a sleeping Mac or a phone in your pocket
// doesn't always count as "the page became visible"). When the day turns over,
// App.vue redraws the screen so everything works from the new date.
export const clock = reactive({ today: todayLocal() })

function check() {
  const now = todayLocal()
  if (now !== clock.today) clock.today = now
}

export function startClock() {
  setInterval(check, 30 * 1000)
  document.addEventListener('visibilitychange', check)
  window.addEventListener('focus', check)
  window.addEventListener('pageshow', check)
}
