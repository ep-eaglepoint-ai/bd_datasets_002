'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteExpense } from '@/server-actions/expenses'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorAlert from '@/components/ui/ErrorAlert'

interface DeleteExpenseButtonProps {
  expenseId: string
  groupId: string
}

export default function DeleteExpenseButton({
  expenseId,
  groupId,
}: DeleteExpenseButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      try {
        await deleteExpense(expenseId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete expense')
        setShowConfirm(false)
      }
    })
  }

  return (
    <div className="relative">
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-25">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <ErrorAlert message={error} onDismiss={() => setError(null)} />
          </div>
        </div>
      )}

      {showConfirm ? (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
          >
            {isPending ? <LoadingSpinner size="sm" /> : 'Confirm'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isPending}
            className="px-3 py-1.5 border border-gray-300 text-black rounded text-xs font-medium hover:bg-gray-50 disabled:opacity-50 min-h-[44px] min-w-[44px]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="text-red-600 hover:text-red-800 text-sm font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Delete expense"
        >
          Delete
        </button>
      )}
    </div>
  )
}
