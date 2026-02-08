'use client'

import { useState } from 'react'
import { recordSettlement } from '@/app/actions/settlements'

interface Props {
  groupId: string
  fromUserId: string
  toUserId: string
  amount: number
}

export default function SettlementButton({ groupId, fromUserId, toUserId, amount }: Props) {
  const [loading, setLoading] = useState(false)

  const handleSettle = async () => {
    setLoading(true)
    try {
      await recordSettlement({ groupId, paidById: fromUserId, receivedById: toUserId, amount })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record settlement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSettle}
      disabled={loading}
      className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white text-xs px-2 py-1 rounded font-medium"
    >
      {loading ? '...' : 'Settle'}
    </button>
  )
}

