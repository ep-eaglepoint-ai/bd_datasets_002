type ConfirmPayload = {
  title: string
  message: string
}

let resolver: ((value: boolean) => void) | null = null

export const useConfirmDialog = () => {
  const isOpen = useState<boolean>('confirm_open', () => false)
  const title = useState<string>('confirm_title', () => 'Confirm action')
  const message = useState<string>('confirm_message', () => 'Are you sure?')

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
