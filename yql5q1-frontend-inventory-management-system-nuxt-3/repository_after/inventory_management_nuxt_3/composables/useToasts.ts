export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

export const useToasts = () => {
  const toasts = useState<ToastMessage[]>('toasts', () => [])

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    toasts.value.push({ id, message, type })
    setTimeout(() => removeToast(id), 3200)
  }

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return { toasts, addToast, removeToast }
}
