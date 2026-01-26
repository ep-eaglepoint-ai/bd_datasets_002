'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { leaveGroup } from '@/server-actions/groups'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorAlert from '@/components/ui/ErrorAlert'

interface LeaveGroupButtonProps {
  groupId: string
}

export default function LeaveGroupButton({ groupId }: LeaveGroupButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleLeave = () => {
    setError(null)
    startTransition(async () => {
      try {
        await leaveGroup(groupId)
        router.push('/groups')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to leave group')
        setShowConfirm(false)
      }
    })
  }

  return (
    <div className="space-y-3">
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      
      {showConfirm ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-black font-medium mb-3">
            Are you sure you want to leave this group? You can only leave if your balance is zero.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={handleLeave}
              disabled={isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 min-h-[44px] inline-flex items-center justify-center"
            >
              {isPending ? <LoadingSpinner size="sm" /> : 'Confirm Leave'}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false)
                setError(null)
              }}
              disabled={isPending}
              className="px-4 py-2 border border-gray-400 text-black rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 border border-red-300 text-red-700 rounded-md text-sm font-medium hover:bg-red-50 min-h-[44px]"
        >
          Leave Group
        </button>
      )}
    </div>
  )
}
