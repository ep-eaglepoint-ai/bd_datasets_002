import GroupForm from '@/components/forms/GroupForm'
import ErrorAlert from '@/components/ui/ErrorAlert'

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const search = await searchParams

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-black mb-6">Create New Group</h1>

        {search.error && (
          <div className="mb-6">
            <ErrorAlert message={search.error} />
          </div>
        )}

        <GroupForm />
      </div>
    </div>
  )
}
