import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calculateGroupBalances } from '@/lib/balance-utils'
import { calculateMinimumSettlements, formatCents } from '@/lib/settlement-utils'
import Link from 'next/link'
import AddExpenseForm from './AddExpenseForm'
import AddMemberForm from './AddMemberForm'
import SettlementButton from './SettlementButton'

async function getGroup(id: string) {
  const [group, expenseCount] = await Promise.all([
    prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: true },
        },
        expenses: {
          take: 50,
          include: {
            paidBy: true,
          },
          orderBy: { date: 'desc' },
        },
      },
    }),
    prisma.expense.count({
      where: { groupId: id },
    }),
  ])

  return { ...group, totalExpenses: expenseCount }
}

export default async function GroupPage({ params }: { params: { id: string } }) {
  const group = await getGroup(params.id)

  if (!group) {
    notFound()
  }

  const balances = await calculateGroupBalances(params.id)
  const settlements = calculateMinimumSettlements(balances)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/" className="text-emerald-600 hover:text-emerald-700 text-sm mb-2 inline-block">
            ← Back to Groups
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Add Expense</h2>
            <AddExpenseForm groupId={params.id} members={group.members} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Expenses</h2>
              <span className="text-sm text-gray-500">
                Showing {group.expenses.length} of {group.totalExpenses} expenses
              </span>
            </div>
            <div className="space-y-3">
              {group.expenses.map((expense) => (
                <div key={expense.id} className="flex justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-gray-500">Paid by {expense.paidBy.name}</p>
                  </div>
                  <p className="text-lg font-semibold text-emerald-600">{formatCents(expense.amount)}</p>
                </div>
              ))}
              {group.totalExpenses > 50 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    {group.totalExpenses - 50} more expenses not shown
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Members</h2>
            <AddMemberForm groupId={params.id} />
            <div className="mt-4 space-y-2">
              {group.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-gray-900">{member.user.name}</p>
                    <p className="text-sm text-gray-500">{member.user.email}</p>
                  </div>
                  {member.isAdmin && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Balances</h2>
            {balances.map((balance) => (
              <div key={balance.userId} className="flex justify-between py-2">
                <span>{balance.name}</span>
                <span className={balance.balance > 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {formatCents(balance.balance)}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Settlements</h2>
            {settlements.map((s, i) => (
              <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg mb-2">
                <span>{s.fromName} → {s.toName}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatCents(s.amount)}</span>
                  <SettlementButton groupId={params.id} fromUserId={s.fromUserId} toUserId={s.toUserId} amount={s.amount} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

