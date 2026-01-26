'use client'

import { useState } from 'react'
import { createExpense } from '@/app/actions/expenses'
import { SplitType } from '@prisma/client'

interface Member {
  id: string
  userId: string
  user: { id: string; name: string | null; email: string }
}

export default function AddExpenseForm({ groupId, members }: { groupId: string; members: Member[] }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [splitType, setSplitType] = useState<SplitType>('EQUAL')
  const [selectedMembers, setSelectedMembers] = useState<string[]>(members.map(m => m.userId))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const cents = Math.round(parseFloat(amount) * 100)
      if (isNaN(cents) || cents <= 0) {
        throw new Error('Invalid amount')
      }

      await createExpense({
        groupId,
        paidById: paidBy,
        amount: cents,
        description,
        splitType,
        participants: selectedMembers.map(userId => ({ userId })),
      })

      setDescription('')
      setAmount('')
      setPaidBy('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense')
    } finally {
      setLoading(false)
    }
  }

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Dinner, groceries, etc."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Paid by</label>
        <select
          value={paidBy}
          onChange={e => setPaidBy(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          required
        >
          <option value="">Select who paid</option>
          {members.map(m => (
            <option key={m.userId} value={m.userId}>
              {m.user.name || m.user.email}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Split type</label>
        <select
          value={splitType}
          onChange={e => setSplitType(e.target.value as SplitType)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="EQUAL">Equal</option>
          <option value="EXACT">Exact amounts</option>
          <option value="PERCENTAGE">Percentage</option>
          <option value="SHARE">Shares</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Split between</label>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <button
              key={m.userId}
              type="button"
              onClick={() => toggleMember(m.userId)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedMembers.includes(m.userId)
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {m.user.name || m.user.email}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || selectedMembers.length === 0}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
      >
        {loading ? 'Adding...' : 'Add Expense'}
      </button>
    </form>
  )
}

