import { getUserGroups } from '@/server-actions/groups'
import Link from 'next/link'

export default async function GroupsPage() {
  const groups = await getUserGroups()

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black">Groups</h1>
          <p className="mt-1 text-sm text-gray-800">
            Manage your expense groups
          </p>
        </div>
        <Link
          href="/groups/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 min-h-[44px]"
        >
          Create Group
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">You don't have any groups yet.</p>
          <Link
            href="/groups/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 min-h-[44px]"
          >
            Create your first group
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group: any) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow min-h-[44px]"
            >
              <h3 className="text-lg font-semibold text-black mb-2">
                {group.name}
              </h3>
              {group.description && (
                <p className="text-sm text-gray-800 mb-4">{group.description}</p>
              )}
              <div className="text-sm text-gray-700">
                {group._count.members} members • {group._count.expenses} expenses
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
