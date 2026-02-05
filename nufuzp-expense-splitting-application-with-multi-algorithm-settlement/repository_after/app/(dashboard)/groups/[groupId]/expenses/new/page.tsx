import { getGroup } from '@/server-actions/groups'
import { redirect } from 'next/navigation'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import ErrorAlert from '@/components/ui/ErrorAlert'

export default async function NewExpensePage({
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
        <h1 className="text-3xl font-bold text-black mb-6">Add Expense</h1>

        {search.error && (
          <div className="mb-6">
            <ErrorAlert message={search.error} />
          </div>
        )}

        <ExpenseForm group={group} groupId={groupId} />
      </div>
    </div>
  )
}
