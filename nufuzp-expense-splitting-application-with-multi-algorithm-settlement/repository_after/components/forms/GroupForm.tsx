'use client'

import { useRouter } from 'next/navigation'
import { createGroup } from '@/server-actions/groups'
import FormWithLoading from '@/components/ui/FormWithLoading'
import Link from 'next/link'

export default function GroupForm() {
  const router = useRouter()

  const action = async (formData: FormData) => {
    const name = (formData.get('name') as string)?.trim()
    const description = (formData.get('description') as string)?.trim() || undefined
    if (!name) {
      throw new Error('Group name is required')
    }
    const group = await createGroup(name, description)
    router.push(`/groups/${group.id}`)
    router.refresh()
  }

  return (
    <FormWithLoading action={action} className="bg-white shadow rounded-lg p-6 space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-black">
          Group Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="mt-1 block w-full rounded-md border-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-h-[44px] text-black placeholder-gray-500"
          placeholder="e.g., Roommates, Vacation 2024"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-black">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border text-black placeholder-gray-500"
          placeholder="Optional description for this group"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Link
          href="/groups"
          className="px-4 py-2 border border-gray-900 rounded-md text-sm font-medium text-black hover:bg-gray-50 min-h-[44px] inline-flex items-center justify-center"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] inline-flex items-center justify-center min-w-[120px]"
        >
          Create Group
        </button>
      </div>
    </FormWithLoading>
  )
}
