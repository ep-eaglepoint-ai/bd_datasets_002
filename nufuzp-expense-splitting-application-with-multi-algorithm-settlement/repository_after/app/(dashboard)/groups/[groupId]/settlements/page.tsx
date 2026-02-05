import { getGroup } from '@/server-actions/groups'
import { getSettlementSuggestions } from '@/server-actions/settlements'
import { recordSettlement } from '@/server-actions/settlements'
import { getBalances } from '@/server-actions/balances'
import { formatCents, parseDollarsToCents } from '@/lib/money'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SettlementForm from '@/components/forms/SettlementForm'
import ErrorAlert from '@/components/ui/ErrorAlert'

export default async function SettlementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>
  searchParams: Promise<{ from?: string; to?: string; amount?: string; error?: string }>
}) {
  const { groupId } = await params
  const search = await searchParams
  const [group, suggestions, balances] = await Promise.all([
    getGroup(groupId),
    getSettlementSuggestions(groupId),
    getBalances(groupId),
  ])

  if (!group) {
    redirect('/groups')
  }

  async function handleRecordSettlement(formData: FormData) {
    'use server'
    const fromUserId = formData.get('fromUserId') as string
    const toUserId = formData.get('toUserId') as string
    const amount = formData.get('amount') as string

    if (!fromUserId || !toUserId || !amount) {
      redirect(
        `/groups/${groupId}/settlements?error=All fields are required`
      )
      return
    }

    try {
      const amountCents = parseDollarsToCents(amount)
      await recordSettlement(groupId, fromUserId, toUserId, amountCents)
      redirect(`/groups/${groupId}?success=Settlement recorded`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to record settlement'
      redirect(
        `/groups/${groupId}/settlements?error=${encodeURIComponent(errorMessage)}`
      )
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link
          href={`/groups/${groupId}`}
          className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 inline-block min-h-[44px] min-w-[44px] flex items-center"
        >
          ← Back to Group
        </Link>
        <h1 className="text-3xl font-bold text-black">Settlements</h1>
        <p className="mt-1 text-sm text-gray-800">
          Record payments and view settlement suggestions
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settlement Suggestions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-black mb-4">
            Suggested Settlements
          </h2>
          {suggestions.length === 0 ? (
            <p className="text-sm text-gray-500">All settled up!</p>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-black">
                        {suggestion.fromUser?.name || suggestion.fromUser?.email}
                      </p>
                      <p className="text-xs text-gray-700">should pay</p>
                      <p className="text-sm font-medium text-black">
                        {suggestion.toUser?.name || suggestion.toUser?.email}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-indigo-600">
                      {formatCents(suggestion.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Record Settlement Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-black mb-4">
            Record Settlement
          </h2>
          {search.error && (
            <div className="mb-4">
              <ErrorAlert message={search.error} />
            </div>
          )}
          <SettlementForm
            groupId={groupId}
            members={group.members}
            defaultFrom={search.from}
            defaultTo={search.to}
            defaultAmount={search.amount}
          />
        </div>
      </div>
    </div>
  )
}
