import { reactive } from 'vue'

// One short message at the bottom of the screen, with an optional Undo.
export const toast = reactive({ text: '', undo: null, id: 0 })

let timer
export function showToast(text, undo = null) {
  clearTimeout(timer)
  Object.assign(toast, { text, undo, id: toast.id + 1 })
  timer = setTimeout(hideToast, 6000)
}
export function hideToast() {
  clearTimeout(timer)
  Object.assign(toast, { text: '', undo: null })
}
