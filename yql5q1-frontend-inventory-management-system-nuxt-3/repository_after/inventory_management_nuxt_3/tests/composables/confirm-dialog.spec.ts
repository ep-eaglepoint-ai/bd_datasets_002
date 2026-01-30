import { describe, expect, it } from 'vitest'
import { useConfirmDialog } from '~/composables/useConfirmDialog'

describe('useConfirmDialog', () => {
  it('resolves with user confirmation', async () => {
    const dialog = useConfirmDialog()
    const promise = dialog.confirm({ title: 'Delete', message: 'Are you sure?' })

    expect(dialog.isOpen.value).toBe(true)

    dialog.handleConfirm()
    await expect(promise).resolves.toBe(true)
    expect(dialog.isOpen.value).toBe(false)
  })

  it('resolves with false on cancel', async () => {
    const dialog = useConfirmDialog()
    const promise = dialog.confirm({ title: 'Delete', message: 'Are you sure?' })

    dialog.handleCancel()
    await expect(promise).resolves.toBe(false)
  })
})
