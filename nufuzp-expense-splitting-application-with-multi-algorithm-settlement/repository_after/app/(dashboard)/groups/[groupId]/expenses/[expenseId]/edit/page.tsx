import { getGroup } from '@/server-actions/groups'
import { getExpense } from '@/server-actions/expenses'
import { redirect } from 'next/navigation'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import ErrorAlert from '@/components/ui/ErrorAlert'

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string; expenseId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { groupId, expenseId } = await params
  const search = await searchParams
  
  const [group, expense] = await Promise.all([
    getGroup(groupId),
    getExpense(expenseId)
  ])

  if (!group || !expense) {
    redirect('/groups')
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-black mb-6">Edit Expense</h1>

        {search.error && (
          <div className="mb-6">
            <ErrorAlert message={search.error} />
          </div>
        )}

        <ExpenseForm group={group} groupId={groupId} expense={expense} />
      </div>
    </div>
  )
}
