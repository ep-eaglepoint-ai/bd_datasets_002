import { ref } from 'vue'

type ConfirmPayload = {
  title: string
  message: string
}

let resolver: ((value: boolean) => void) | null = null

// Create shared state for the composable
const isOpenState = ref(false)
const titleState = ref('Confirm action')
const messageState = ref('Are you sure?')

export const useConfirmDialog = () => {
  // Use ref for compatibility with both Nuxt runtime and tests
  // In Nuxt, this could be replaced with useState for SSR safety
  const isOpen = isOpenState
  const title = titleState
  const message = messageState

  const confirm = (payload: ConfirmPayload) => {
    title.value = payload.title
    message.value = payload.message
    isOpen.value = true

    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  const handleConfirm = () => {
    isOpen.value = false
    resolver?.(true)
    resolver = null
  }

  const handleCancel = () => {
    isOpen.value = false
    resolver?.(false)
    resolver = null
  }

  return { isOpen, title, message, confirm, handleConfirm, handleCancel }
}
