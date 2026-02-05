import { prisma } from './db'

/**
 * Balance calculation utilities
 * Balances are calculated from expenses and settlements
 * All operations must be atomic (within transactions)
 */

export interface UserBalance {
  userId: string
  amount: number // in cents (positive = owed money, negative = owes money)
}

/**
 * Recalculate all balances for a group
 * This should be called within a transaction
 * @param tx - Prisma transaction client (optional, defaults to prisma)
 */
export async function recalculateGroupBalances(
  groupId: string,
  tx?: any
): Promise<void> {
  const client = tx || prisma
  // Get all group members
  const members = await client.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  })

  const userIds = members.map((m: { userId: string }) => m.userId)

  if (userIds.length === 0) {
    return
  }

  // Calculate balance for each user
  const balances: Map<string, number> = new Map()
  userIds.forEach((userId: string) => balances.set(userId, 0))

  // Process expenses: person who paid gets positive, people who owe get negative
  const expenses = await client.expense.findMany({
    where: { groupId },
    include: { splits: true },
  })

  for (const expense of expenses) {
    // Person who paid gets the full amount (they're owed money)
    const currentPaid = balances.get(expense.paidByUserId) || 0
    balances.set(expense.paidByUserId, currentPaid + expense.amount)

    // People who owe get negative amounts
    for (const split of expense.splits) {
      const currentOwed = balances.get(split.userId) || 0
      balances.set(split.userId, currentOwed - split.amount)
    }
  }

  // Process settlements: from user pays to user
  const settlements = await client.settlement.findMany({
    where: { groupId },
  })

  for (const settlement of settlements) {
    // From user's balance decreases (they paid)
    const fromCurrent = balances.get(settlement.fromUserId) || 0
    balances.set(settlement.fromUserId, fromCurrent - settlement.amount)

    // To user's balance increases (they received)
    const toCurrent = balances.get(settlement.toUserId) || 0
    balances.set(settlement.toUserId, toCurrent + settlement.amount)
  }

  // Update or create balance records
  for (const [userId, amount] of balances.entries()) {
    await client.balance.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      create: {
        groupId,
        userId,
        amount,
      },
      update: {
        amount,
      },
    })
  }
}

/**
 * Get current balances for a group
 */
export async function getGroupBalances(groupId: string): Promise<UserBalance[]> {
  const balances = await prisma.balance.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return balances.map((b: { userId: string; amount: number }) => ({
    userId: b.userId,
    amount: b.amount,
  }))
}

/**
 * Check if a user has zero balance in a group
 */
export async function hasZeroBalance(groupId: string, userId: string): Promise<boolean> {
  const balance = await prisma.balance.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
  })

  return !balance || balance.amount === 0
}
