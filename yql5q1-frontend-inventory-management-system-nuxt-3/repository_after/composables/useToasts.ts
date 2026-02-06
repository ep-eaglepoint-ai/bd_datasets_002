import { ref } from 'vue'

export type Toast = {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

const toasts = ref<Toast[]>([])

function addToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  const id = `${Date.now()}-${Math.random()}`
  const toast: Toast = { id, message, type }
  toasts.value.push(toast)

  if (type !== 'error') {
    setTimeout(() => {
      removeToast(id)
    }, 3000)
  }
}

function removeToast(id: string) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

export function useToasts() {
  return {
    toasts,
    addToast,
    removeToast
  }
}