'use client'

import { useRouter } from 'next/navigation'
import { inviteToGroup } from '@/server-actions/groups'
import FormWithLoading from '@/components/ui/FormWithLoading'
import Link from 'next/link'

interface InviteFormProps {
  groupId: string
  groupName: string
}

export default function InviteForm({ groupId, groupName }: InviteFormProps) {
  const router = useRouter()

  const action = async (formData: FormData) => {
    const email = (formData.get('email') as string)?.trim()
    if (!email) {
      throw new Error('Email is required')
    }
    await inviteToGroup(groupId, email)
    router.push(`/groups/${groupId}?success=Invitation sent`)
    router.refresh()
  }

  return (
    <FormWithLoading action={action} className="bg-white shadow rounded-lg p-6 space-y-6">
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
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] inline-flex items-center justify-center min-w-[140px]"
        >
          Send Invitation
        </button>
      </div>
    </FormWithLoading>
  )
}
