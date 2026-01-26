import { prisma } from './prisma'
import { UserBalance } from './settlement-utils'

export async function calculateGroupBalances(groupId: string): Promise<UserBalance[]> {
  const [members, expensesPaidData, expenseSplitsData, settlementsPaidData, settlementsReceivedData] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: true },
    }),
    prisma.expense.groupBy({
      by: ['paidById'],
      where: { groupId },
      _sum: { amount: true },
    }),
    prisma.expenseSplit.groupBy({
      by: ['userId'],
      where: { expense: { groupId } },
      _sum: { amount: true },
    }),
    prisma.settlement.groupBy({
      by: ['paidById'],
      where: { groupId },
      _sum: { amount: true },
    }),
    prisma.settlement.groupBy({
      by: ['receivedById'],
      where: { groupId },
      _sum: { amount: true },
    }),
  ])

  const expensesPaidMap = new Map(expensesPaidData.map(item => [item.paidById, item._sum.amount || 0]))
  const expenseSplitsMap = new Map(expenseSplitsData.map(item => [item.userId, item._sum.amount || 0]))
  const settlementsPaidMap = new Map(settlementsPaidData.map(item => [item.paidById, item._sum.amount || 0]))
  const settlementsReceivedMap = new Map(settlementsReceivedData.map(item => [item.receivedById, item._sum.amount || 0]))

  return members.map(member => {
    const totalPaid = expensesPaidMap.get(member.userId) || 0
    const totalOwed = expenseSplitsMap.get(member.userId) || 0
    const totalSettlementsPaid = settlementsPaidMap.get(member.userId) || 0
    const totalSettlementsReceived = settlementsReceivedMap.get(member.userId) || 0

    const balance = totalPaid - totalOwed - totalSettlementsPaid + totalSettlementsReceived

    return {
      userId: member.userId,
      name: member.user.name || member.user.email,
      balance,
    }
  })
}

export async function getUserBalanceInGroup(groupId: string, userId: string): Promise<number> {
  const [expensesPaid, expenseSplits, settlementsPaid, settlementsReceived] = await Promise.all([
    prisma.expense.aggregate({
      where: { groupId, paidById: userId },
      _sum: { amount: true },
    }),
    prisma.expenseSplit.aggregate({
      where: {
        userId,
        expense: { groupId },
      },
      _sum: { amount: true },
    }),
    prisma.settlement.aggregate({
      where: { groupId, paidById: userId },
      _sum: { amount: true },
    }),
    prisma.settlement.aggregate({
      where: { groupId, receivedById: userId },
      _sum: { amount: true },
    }),
  ])

  const totalPaid = expensesPaid._sum.amount || 0
  const totalOwed = expenseSplits._sum.amount || 0
  const totalSettlementsPaid = settlementsPaid._sum.amount || 0
  const totalSettlementsReceived = settlementsReceived._sum.amount || 0

  return totalPaid - totalOwed - totalSettlementsPaid + totalSettlementsReceived
}

