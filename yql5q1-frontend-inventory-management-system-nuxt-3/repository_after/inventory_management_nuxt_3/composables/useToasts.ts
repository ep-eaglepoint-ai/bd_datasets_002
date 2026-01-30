import { ref } from 'vue'

const toasts = ref<string[]>([])

function addToast(message: string, type: string = 'info') {
  toasts.value.push(`${type.toUpperCase()}: ${message}`)
}
function removeToast(index: number) {
  toasts.value.splice(index, 1)
}

export function useToasts() {
  return {
    toasts,
    addToast,
    removeToast
  }
}