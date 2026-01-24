import { prisma } from './prisma'
import { UserBalance } from './settlement-utils'

export async function calculateGroupBalances(groupId: string): Promise<UserBalance[]> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: true },
  })

  const balances: UserBalance[] = []

  for (const member of members) {
    const expensesPaid = await prisma.expense.aggregate({
      where: { groupId, paidById: member.userId },
      _sum: { amount: true },
    })

    const expenseSplits = await prisma.expenseSplit.aggregate({
      where: {
        userId: member.userId,
        expense: { groupId },
      },
      _sum: { amount: true },
    })

    const settlementsPaid = await prisma.settlement.aggregate({
      where: { groupId, paidById: member.userId },
      _sum: { amount: true },
    })

    const settlementsReceived = await prisma.settlement.aggregate({
      where: { groupId, receivedById: member.userId },
      _sum: { amount: true },
    })

    const totalPaid = expensesPaid._sum.amount || 0
    const totalOwed = expenseSplits._sum.amount || 0
    const totalSettlementsPaid = settlementsPaid._sum.amount || 0
    const totalSettlementsReceived = settlementsReceived._sum.amount || 0

    const balance = totalPaid - totalOwed - totalSettlementsPaid + totalSettlementsReceived

    balances.push({
      userId: member.userId,
      name: member.user.name || member.user.email,
      balance,
    })
  }

  return balances
}

export async function getUserBalanceInGroup(groupId: string, userId: string): Promise<number> {
  const balances = await calculateGroupBalances(groupId)
  const userBalance = balances.find(b => b.userId === userId)
  return userBalance?.balance || 0
}

