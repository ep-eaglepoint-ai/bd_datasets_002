import { getGroup } from '@/server-actions/groups'
import { redirect } from 'next/navigation'
import InviteForm from '@/components/forms/InviteForm'
import ErrorAlert from '@/components/ui/ErrorAlert'

export default async function InviteMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { groupId } = await params
  const search = await searchParams
  const group = await getGroup(groupId)

  if (!group) {
    redirect('/groups')
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-black mb-6">
          Invite Member to {group.name}
        </h1>

        {search.error && (
          <div className="mb-6">
            <ErrorAlert message={search.error} />
          </div>
        )}

        <InviteForm groupId={groupId} groupName={group.name} />
      </div>
    </div>
  )
}
