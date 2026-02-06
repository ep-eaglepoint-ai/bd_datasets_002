import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useToasts } from '~/composables/useToasts'

describe('useToasts', () => {
  beforeEach(() => {
    const { toasts } = useToasts()
    toasts.value = []
  })

  it('adds toast messages and removes them after timeout', () => {
    vi.useFakeTimers()
    const { toasts, addToast } = useToasts()

    addToast('Created', 'success')
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({ message: 'Created', type: 'success' })

    vi.advanceTimersByTime(3200)
    expect(toasts.value).toHaveLength(0)
    vi.useRealTimers()
  })

  it('manually removes a toast', () => {
    const { toasts, addToast, removeToast } = useToasts()
    addToast('Delete me', 'error')
    const toastId = toasts.value[0].id
    removeToast(toastId)
    expect(toasts.value).toHaveLength(0)
  })
})
