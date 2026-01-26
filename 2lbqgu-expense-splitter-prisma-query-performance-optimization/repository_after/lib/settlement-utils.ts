export interface UserBalance {
  userId: string
  name: string
  balance: number
}

export interface SettlementTransaction {
  fromUserId: string
  fromName: string
  toUserId: string
  toName: string
  amount: number
}

export function calculateMinimumSettlements(balances: UserBalance[]): SettlementTransaction[] {
  const nonZeroBalances = balances.filter(b => b.balance !== 0)
  
  if (nonZeroBalances.length === 0) {
    return []
  }

  const creditors = nonZeroBalances
    .filter(b => b.balance > 0)
    .map(b => ({ ...b }))
    .sort((a, b) => b.balance - a.balance)

  const debtors = nonZeroBalances
    .filter(b => b.balance < 0)
    .map(b => ({ ...b, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance)

  const transactions: SettlementTransaction[] = []

  let creditorIdx = 0
  let debtorIdx = 0

  while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
    const creditor = creditors[creditorIdx]
    const debtor = debtors[debtorIdx]

    const amount = Math.min(creditor.balance, debtor.balance)

    if (amount > 0) {
      transactions.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amount,
      })
    }

    creditor.balance -= amount
    debtor.balance -= amount

    if (creditor.balance === 0) {
      creditorIdx++
    }
    if (debtor.balance === 0) {
      debtorIdx++
    }
  }

  return transactions
}

export function formatCents(cents: number): string {
  const dollars = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars)
}

export function parseDollarsToCents(dollars: string | number): number {
  const value = typeof dollars === 'string' ? parseFloat(dollars) : dollars
  if (isNaN(value)) {
    throw new Error('Invalid dollar amount')
  }
  return Math.round(value * 100)
}

