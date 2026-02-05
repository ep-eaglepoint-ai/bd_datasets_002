import { getGroup } from '@/server-actions/groups'
import { getBalances } from '@/server-actions/balances'
import { getGroupExpenses } from '@/server-actions/expenses'
import { getSettlementSuggestions } from '@/server-actions/settlements'
import { formatCents } from '@/lib/money'
import Link from 'next/link'
import LeaveGroupButton from '@/components/groups/LeaveGroupButton'
import DeleteExpenseButton from '@/components/expenses/DeleteExpenseButton'
import { auth } from '@/lib/auth'

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const session = await auth()
  const [group, balances, expenses, suggestions] = await Promise.all([
    getGroup(groupId),
    getBalances(groupId),
    getGroupExpenses(groupId),
    getSettlementSuggestions(groupId),
  ])

  if (!group) {
    return <div>Group not found</div>
  }

  const currentUserMember = group.members.find(m => m.userId === session?.user?.id)


  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link
          href="/groups"
          className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 inline-block min-h-[44px] min-w-[44px] flex items-center"
        >
          ← Back to Groups
        </Link>
        <h1 className="text-3xl font-bold text-black">{group.name}</h1>
        {group.description && (
          <p className="mt-1 text-sm text-gray-800">{group.description}</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Balances Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">Balances</h2>
            </div>
            {balances.length === 0 ? (
              <p className="text-gray-700 text-sm">No balances yet</p>
            ) : (
              <>
                {/* Desktop: Simple list */}
                <div className="hidden md:block space-y-3">
                  {balances.map((balance: any) => (
                    <div
                      key={balance.userId}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
                    >
                      <span className="text-sm font-medium text-black">
                        {balance.user?.name || balance.user?.email}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          balance.amount > 0
                            ? 'text-green-600'
                            : balance.amount < 0
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {balance.amount > 0
                          ? `+${formatCents(balance.amount)}`
                          : formatCents(balance.amount)}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Mobile: Cards */}
                <div className="md:hidden space-y-3">
                  {balances.map((balance: any) => (
                    <div
                      key={balance.userId}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-black">
                            {balance.user?.name || balance.user?.email}
                          </p>
                        </div>
                        <span
                          className={`text-base font-semibold ${
                            balance.amount > 0
                              ? 'text-green-600'
                              : balance.amount < 0
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {balance.amount > 0
                            ? `+${formatCents(balance.amount)}`
                            : formatCents(balance.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Expenses Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
              <h2 className="text-xl font-semibold text-black">Expenses</h2>
              <Link
                href={`/groups/${groupId}/expenses/new`}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 min-h-[44px] inline-flex items-center justify-center w-full sm:w-auto"
              >
                Add Expense
              </Link>
            </div>
            {expenses.length === 0 ? (
              <p className="text-gray-700 text-sm">No expenses yet</p>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense: any) => (
                  <div
                    key={expense.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-black text-base">
                          {expense.description}
                        </h3>
                        <p className="text-sm text-gray-700 mt-1">
                          Paid by {expense.paidBy?.name || expense.paidBy?.email}
                        </p>
                      </div>
                      <span className="text-lg font-semibold text-black sm:text-right">
                        {formatCents(expense.amount)}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <div className="text-xs text-gray-500">
                        Split: {expense.splitType} •{' '}
                        {expense.splits?.length || 0} participants
                      </div>
                      <div className="flex items-center space-x-4">
                        <Link
                          href={`/groups/${groupId}/expenses/${expense.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          Edit
                        </Link>
                        <DeleteExpenseButton
                          expenseId={expense.id}
                          groupId={groupId}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Settlement Suggestions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-black mb-4">
              Settlement Suggestions
            </h2>
            {suggestions.length === 0 ? (
              <p className="text-sm text-gray-700">All settled up!</p>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 bg-blue-50 rounded-md border border-blue-200"
                  >
                    <p className="text-sm text-black">
                      <span className="font-medium">
                        {suggestion.fromUser?.name || suggestion.fromUser?.email}
                      </span>{' '}
                      should pay{' '}
                      <span className="font-medium">
                        {suggestion.toUser?.name || suggestion.toUser?.email}
                      </span>
                    </p>
                    <p className="text-sm font-semibold text-indigo-600 mt-1">
                      {formatCents(suggestion.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Group Members */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-black mb-4">
              Members
            </h2>
            <div className="space-y-2">
              {group.members.map((member: any) => (
                <div
                  key={member.userId}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-black">
                    {member.user?.name || member.user?.email}
                  </span>
                  {member.role === 'OWNER' && (
                    <span className="text-xs text-indigo-600 font-medium">
                      Owner
                    </span>
                  )}
                </div>
              ))}
            </div>
            <Link
              href={`/groups/${groupId}/invite`}
              className="mt-4 block w-full text-center px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md text-sm font-medium hover:bg-indigo-50 min-h-[44px] inline-flex items-center justify-center"
            >
              Invite Member
            </Link>
            {currentUserMember && (
              <div className="mt-4 pt-4 border-t">
                <LeaveGroupButton groupId={groupId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
