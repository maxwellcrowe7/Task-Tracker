import { reactive, watch } from 'vue'
import { THEME_DEFAULTS, resolveTheme } from './themeRules.js'

// Saved in this browser only (it's a per-device preference). index.html applies
// the saved theme before the page draws, so there's no flash on load.
const KEY = 'habit-tracker-theme'

function load() {
  try {
    const saved = { ...THEME_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
    if (saved.mode !== 'light' && saved.mode !== 'dark') saved.mode = 'auto'
    return saved
  } catch {
    return { ...THEME_DEFAULTS }
  }
}

export const themeSettings = reactive(load())

function apply() {
  const theme = resolveTheme(themeSettings, new Date())
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f1218' : '#f3f5f8')
}

export function startTheme() {
  apply()
  watch(
    themeSettings,
    () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(themeSettings))
      } catch {
        // Private browsing etc.: the choice just won't be remembered.
      }
      apply()
    },
    { deep: true },
  )
  document.addEventListener('visibilitychange', apply)
  setInterval(apply, 60_000) // for the timed switch in Auto
}
