'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inviteToGroup } from '@/server-actions/groups'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorAlert from '@/components/ui/ErrorAlert'
import Link from 'next/link'

interface InviteFormProps {
  groupId: string
  groupName: string
}

export default function InviteForm({ groupId, groupName }: InviteFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    if (!email) {
      setError('Email is required')
      return
    }

    startTransition(async () => {
      try {
        await inviteToGroup(groupId, email)
        router.push(`/groups/${groupId}?success=Invitation sent`)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send invitation')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-black">
          Email Address *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-h-[44px] text-black placeholder-gray-800"
          placeholder="user@example.com"
        />
        <p className="mt-2 text-sm text-black">
          The user must have an account. They will be added to the group if they
          exist.
        </p>
      </div>

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
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] inline-flex items-center justify-center min-w-[140px]"
        >
          {isPending ? <LoadingSpinner size="sm" /> : 'Send Invitation'}
        </button>
      </div>
    </form>
  )
}
