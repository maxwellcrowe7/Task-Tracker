import { reactive, watch } from 'vue'

// Personal / Work: the top-level split. Every screen shows one side only.
// Remembered per device, like the appearance setting.
const KEY = 'upkeep-context'

function load() {
  try {
    return localStorage.getItem(KEY) === 'work' ? 'work' : 'personal'
  } catch {
    return 'personal'
  }
}

export const context = reactive({ scope: load() })

watch(
  () => context.scope,
  (scope) => {
    try {
      localStorage.setItem(KEY, scope)
    } catch {
      // Private browsing etc.: it just won't be remembered.
    }
  },
)
