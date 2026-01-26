'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { recordSettlement } from '@/server-actions/settlements'
import { parseDollarsToCents } from '@/lib/money'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorAlert from '@/components/ui/ErrorAlert'

interface Member {
  userId: string
  user: {
    name: string | null
    email: string
  }
}

interface SettlementFormProps {
  groupId: string
  members: Member[]
  defaultFrom?: string
  defaultTo?: string
  defaultAmount?: string
}

export default function SettlementForm({
  groupId,
  members,
  defaultFrom,
  defaultTo,
  defaultAmount,
}: SettlementFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [fromUserId, setFromUserId] = useState(defaultFrom || '')
  const [toUserId, setToUserId] = useState(defaultTo || '')
  const [amount, setAmount] = useState(defaultAmount || '')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!fromUserId || !toUserId || !amount) {
      setError('All fields are required')
      return
    }

    if (fromUserId === toUserId) {
      setError('From and To must be different people')
      return
    }

    try {
      const amountCents = parseDollarsToCents(amount)
      startTransition(async () => {
        try {
          await recordSettlement(groupId, fromUserId, toUserId, amountCents)
          router.push(`/groups/${groupId}?success=Settlement recorded`)
          router.refresh()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to record settlement')
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid amount')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div>
        <label
          htmlFor="fromUserId"
          className="block text-sm font-medium text-black mb-2"
        >
          From *
        </label>
        <select
          id="fromUserId"
          value={fromUserId}
          onChange={(e) => setFromUserId(e.target.value)}
          required
          className="block w-full rounded-md border-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-h-[44px] text-black"
        >
          <option value="">Select person</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.user?.name || member.user?.email}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="toUserId"
          className="block text-sm font-medium text-black mb-2"
        >
          To *
        </label>
        <select
          id="toUserId"
          value={toUserId}
          onChange={(e) => setToUserId(e.target.value)}
          required
          className="block w-full rounded-md border-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-h-[44px] text-black"
        >
          <option value="">Select person</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.user?.name || member.user?.email}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-black mb-2"
        >
          Amount *
        </label>
        <input
          type="text"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0.00"
          className="block w-full rounded-md border-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-h-[44px] text-black placeholder-gray-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] inline-flex items-center justify-center"
      >
        {isPending ? <LoadingSpinner size="sm" /> : 'Record Settlement'}
      </button>
    </form>
  )
}
