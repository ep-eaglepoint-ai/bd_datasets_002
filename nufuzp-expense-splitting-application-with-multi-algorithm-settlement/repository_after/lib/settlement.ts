/**
 * Settlement algorithm utilities
 * Finds the minimum number of transactions to settle all debts
 */

export interface SettlementTransaction {
  fromUserId: string
  toUserId: string
  amount: number // in cents
}

export interface UserBalance {
  userId: string
  amount: number // in cents (positive = owed money, negative = owes money)
}

/**
 * Calculate minimum transactions to settle all debts
 * Uses a greedy algorithm:
 * 1. Separate creditors (positive) and debtors (negative)
 * 2. Match largest creditor with largest debtor
 * 3. Continue until all balances are zero
 * 
 * Example: [+5000, +3000, -4000, -4000] should produce at most 3 transactions
 */
export function calculateMinimumSettlements(
  balances: UserBalance[]
): SettlementTransaction[] {
  // Filter out zero balances
  const nonZeroBalances = balances.filter(b => b.amount !== 0)

  if (nonZeroBalances.length === 0) {
    return []
  }

  // Separate creditors and debtors
  const creditors: UserBalance[] = []
  const debtors: UserBalance[] = []

  for (const balance of nonZeroBalances) {
    if (balance.amount > 0) {
      creditors.push({ ...balance })
    } else if (balance.amount < 0) {
      debtors.push({
        userId: balance.userId,
        amount: Math.abs(balance.amount), // Make positive for easier calculation
      })
    }
  }

  // Sort: largest first
  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const transactions: SettlementTransaction[] = []
  let creditorIndex = 0
  let debtorIndex = 0

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]

    if (creditor.amount === 0) {
      creditorIndex++
      continue
    }

    if (debtor.amount === 0) {
      debtorIndex++
      continue
    }

    // Calculate settlement amount
    const settlementAmount = Math.min(creditor.amount, debtor.amount)

    // Create transaction
    transactions.push({
      fromUserId: debtor.userId,
      toUserId: creditor.userId,
      amount: settlementAmount,
    })

    // Update amounts
    creditor.amount -= settlementAmount
    debtor.amount -= settlementAmount

    // Move to next if fully settled
    if (creditor.amount === 0) {
      creditorIndex++
    }
    if (debtor.amount === 0) {
      debtorIndex++
    }
  }

  return transactions
}

/**
 * Validate that settlements will zero all balances
 */
export function validateSettlements(
  balances: UserBalance[],
  settlements: SettlementTransaction[]
): boolean {
  // Create a map of final balances
  const finalBalances = new Map<string, number>()
  
  // Initialize with current balances
  for (const balance of balances) {
    finalBalances.set(balance.userId, balance.amount)
  }

  // Apply settlements
  for (const settlement of settlements) {
    const fromCurrent = finalBalances.get(settlement.fromUserId) || 0
    const toCurrent = finalBalances.get(settlement.toUserId) || 0

    finalBalances.set(settlement.fromUserId, fromCurrent - settlement.amount)
    finalBalances.set(settlement.toUserId, toCurrent + settlement.amount)
  }

  // Check if all balances are zero
  for (const amount of finalBalances.values()) {
    if (amount !== 0) {
      return false
    }
  }

  return true
}
