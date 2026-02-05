'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense, updateExpense } from '@/server-actions/expenses'
import { formatCents, parseDollarsToCents, centsToDollars } from '@/lib/money'
import { SplitType } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorAlert from '@/components/ui/ErrorAlert'
import Link from 'next/link'

interface Member {
  userId: string
  user: {
    name: string | null
    email: string
  }
}

interface Group {
  id: string
  members: Member[]
}

interface ExpenseFormProps {
  group: Group
  groupId: string
  expense?: any
}

export default function ExpenseForm({ group, groupId, expense }: ExpenseFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!expense

  const [description, setDescription] = useState(expense?.description || '')
  const [amount, setAmount] = useState(
    expense ? centsToDollars(expense.amount).toString() : ''
  )
  const [paidByUserId, setPaidByUserId] = useState(
    expense?.paidByUserId || group.members[0]?.userId || ''
  )
  const [splitType, setSplitType] = useState<SplitType>(
    expense?.splitType || 'EQUAL'
  )
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    expense?.splits.map((s: any) => s.userId) || []
  )
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(
    expense?.splitType === 'EXACT'
      ? expense.splits.reduce((acc: any, s: any) => {
          acc[s.userId] = centsToDollars(s.amount).toString()
          return acc
        }, {})
      : {}
  )
  const [percentages, setPercentages] = useState<Record<string, string>>(
    expense?.splitType === 'PERCENTAGE'
      ? expense.splits.reduce((acc: any, s: any) => {
          acc[s.userId] = s.percentage?.toString() || ''
          return acc
        }, {})
      : {}
  )
  const [shares, setShares] = useState<Record<string, string>>(
    expense?.splitType === 'SHARE'
      ? expense.splits.reduce((acc: any, s: any) => {
          acc[s.userId] = s.share?.toString() || ''
          return acc
        }, {})
      : {}
  )

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleExactAmountChange = (userId: string, value: string) => {
    setExactAmounts((prev) => ({ ...prev, [userId]: value }))
  }

  const handlePercentageChange = (userId: string, value: string) => {
    setPercentages((prev) => ({ ...prev, [userId]: value }))
  }

  const handleShareChange = (userId: string, value: string) => {
    setShares((prev) => ({ ...prev, [userId]: value }))
  }

  const calculateExactTotal = () => {
    return Object.values(exactAmounts).reduce((sum, val) => {
      if (!val) return sum
      try {
        return sum + parseDollarsToCents(val)
      } catch {
        return sum
      }
    }, 0)
  }

  const calculatePercentageTotal = () => {
    return Object.values(percentages).reduce((sum, val) => {
      if (!val) return sum
      return sum + parseFloat(val)
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!description || !amount || !paidByUserId || !splitType) {
      setError('All fields are required')
      return
    }

    try {
      const amountCents = parseDollarsToCents(amount)
      const participants: any[] = []

      if (splitType === 'EQUAL') {
        if (selectedParticipants.length === 0) {
          setError('Select at least one participant')
          return
        }
        participants.push(...selectedParticipants.map((userId) => ({ userId })))
      } else if (splitType === 'EXACT') {
        const exactTotal = calculateExactTotal()
        if (exactTotal !== amountCents) {
          setError(`Exact amounts must sum to ${amount}`)
          return
        }
        Object.entries(exactAmounts).forEach(([userId, val]) => {
          if (val) {
            participants.push({
              userId,
              amount: parseDollarsToCents(val),
            })
          }
        })
      } else if (splitType === 'PERCENTAGE') {
        const percentageTotal = calculatePercentageTotal()
        if (Math.abs(percentageTotal - 100) >= 0.01) {
          setError('Percentages must total exactly 100%')
          return
        }
        Object.entries(percentages).forEach(([userId, val]) => {
          if (val) {
            participants.push({
              userId,
              percentage: parseFloat(val),
            })
          }
        })
      } else if (splitType === 'SHARE') {
        Object.entries(shares).forEach(([userId, val]) => {
          if (val) {
            participants.push({
              userId,
              share: parseInt(val, 10),
            })
          }
        })
        if (participants.length === 0) {
          setError('Enter at least one share')
          return
        }
      }

      if (participants.length === 0) {
        setError('Add at least one participant')
        return
      }

      startTransition(async () => {
        try {
          if (isEditing) {
            await updateExpense(
              expense.id,
              amountCents,
              description,
              splitType,
              participants
            )
          } else {
            await createExpense(
              groupId,
              paidByUserId,
              amountCents,
              description,
              splitType,
              participants
            )
          }
          router.push(`/groups/${groupId}`)
          router.refresh()
        } catch (err) {
          setError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} expense`)
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid input')
    }
  }

  const renderSplitInputs = () => {
    if (splitType === 'EQUAL') {
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-black mb-2">
            Select Participants *
          </label>
          {group.members.map((member) => (
            <label
              key={member.userId}
              className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer min-h-[44px]"
            >
              <input
                type="checkbox"
                checked={selectedParticipants.includes(member.userId)}
                onChange={() => toggleParticipant(member.userId)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 min-w-[20px] min-h-[20px]"
              />
              <span className="ml-3 text-sm text-black">
                {member.user.name || member.user.email}
              </span>
            </label>
          ))}
        </div>
      )
    }

    if (splitType === 'EXACT') {
      const total = amount ? parseDollarsToCents(amount) : 0
      const exactTotal = calculateExactTotal()
      const difference = total - exactTotal

      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-black mb-2">
            Enter Exact Amounts *
          </label>
          {group.members.map((member) => (
            <div key={member.userId} className="flex items-center space-x-3">
              <label className="flex-1 text-sm text-black min-w-[120px]">
                {member.user.name || member.user.email}
              </label>
              <input
                type="text"
                value={exactAmounts[member.userId] || ''}
                onChange={(e) =>
                  handleExactAmountChange(member.userId, e.target.value)
                }
                placeholder="0.00"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-h-[44px]"
              />
            </div>
          ))}
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total:</span>
              <span
                className={
                  difference === 0
                    ? 'text-green-600 font-semibold'
                    : 'text-red-600 font-semibold'
                }
              >
                {formatCents(exactTotal)} / {formatCents(total)}
              </span>
            </div>
            {difference !== 0 && (
              <p className="text-xs text-red-600 mt-1">
                Difference: {formatCents(Math.abs(difference))}
              </p>
            )}
          </div>
        </div>
      )
    }

    if (splitType === 'PERCENTAGE') {
      const percentageTotal = calculatePercentageTotal()

      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-black mb-2">
            Enter Percentages *
          </label>
          {group.members.map((member) => (
            <div key={member.userId} className="flex items-center space-x-3">
              <label className="flex-1 text-sm text-black min-w-[120px]">
                {member.user.name || member.user.email}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={percentages[member.userId] || ''}
                onChange={(e) =>
                  handlePercentageChange(member.userId, e.target.value)
                }
                placeholder="0"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-h-[44px]"
              />
              <span className="text-sm text-gray-800 w-8">%</span>
            </div>
          ))}
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total:</span>
              <span
                className={
                  Math.abs(percentageTotal - 100) < 0.01
                    ? 'text-green-600 font-semibold'
                    : 'text-red-600 font-semibold'
                }
              >
                {percentageTotal.toFixed(2)}%
              </span>
            </div>
            {Math.abs(percentageTotal - 100) >= 0.01 && (
              <p className="text-xs text-red-600 mt-1">
                Must total exactly 100%
              </p>
            )}
          </div>
        </div>
      )
    }

    if (splitType === 'SHARE') {
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-black mb-2">
            Enter Share Ratios *
          </label>
          {group.members.map((member) => (
            <div key={member.userId} className="flex items-center space-x-3">
              <label className="flex-1 text-sm text-black min-w-[120px]">
                {member.user.name || member.user.email}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={shares[member.userId] || ''}
                onChange={(e) => handleShareChange(member.userId, e.target.value)}
                placeholder="1"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-h-[44px]"
              />
            </div>
          ))}
          <p className="text-xs text-gray-800 mt-2">
            Example: 2:1:1 means first person pays 2 parts, others pay 1 part
            each
          </p>
        </div>
      )
    }

    return null
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
      {/* Shared pattern: ErrorAlert + useTransition loading (complex payload; FormWithLoading not used) */}
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-black">
          Description *
        </label>
        <input
          type="text"
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-h-[44px] text-black placeholder-gray-500"
          placeholder="e.g., Dinner at restaurant"
        />
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-black">
          Amount *
        </label>
        <input
          type="text"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-h-[44px] text-black placeholder-gray-500"
          placeholder="0.00"
        />
      </div>

      <div>
        <label htmlFor="paidByUserId" className="block text-sm font-medium text-black">
          Paid By *
        </label>
        <select
          id="paidByUserId"
          value={paidByUserId}
          onChange={(e) => setPaidByUserId(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-h-[44px] text-black"
        >
          {group.members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.user?.name || member.user?.email}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="splitType" className="block text-sm font-medium text-black">
          Split Type *
        </label>
        <select
          id="splitType"
          value={splitType}
          onChange={(e) => setSplitType(e.target.value as SplitType)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-h-[44px] text-black"
        >
          <option value="EQUAL">Equal</option>
          <option value="EXACT">Exact Amounts</option>
          <option value="PERCENTAGE">Percentage</option>
          <option value="SHARE">Share (Ratio)</option>
        </select>
      </div>

      <div className="space-y-4">{renderSplitInputs()}</div>

      <div className="flex justify-end space-x-3">
        <Link
          href={`/groups/${groupId}`}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-black hover:bg-gray-50 min-h-[44px] inline-flex items-center justify-center"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] inline-flex items-center justify-center min-w-[120px]"
        >
          {isPending ? (
            <LoadingSpinner size="sm" />
          ) : isEditing ? (
            'Update Expense'
          ) : (
            'Create Expense'
          )}
        </button>
      </div>
    </form>
  )
}
