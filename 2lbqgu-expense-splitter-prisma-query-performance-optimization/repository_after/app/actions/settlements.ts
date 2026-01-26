'use server'

import { prisma } from '@/lib/prisma'
import { calculateGroupBalances } from '@/lib/balance-utils'
import { calculateMinimumSettlements, SettlementTransaction } from '@/lib/settlement-utils'
import { revalidatePath } from 'next/cache'

export async function getSettlementSuggestions(groupId: string): Promise<SettlementTransaction[]> {
  const balances = await calculateGroupBalances(groupId)
  return calculateMinimumSettlements(balances)
}

export async function recordSettlement({
  groupId,
  paidById,
  receivedById,
  amount,
  description,
}: {
  groupId: string
  paidById: string
  receivedById: string
  amount: number
  description?: string
}) {
  if (amount <= 0) {
    throw new Error('Settlement amount must be positive')
  }

  if (paidById === receivedById) {
    throw new Error('Cannot settle with yourself')
  }

  const settlement = await prisma.settlement.create({
    data: {
      groupId,
      paidById,
      receivedById,
      amount,
      description,
    },
  })

  revalidatePath(`/groups/${groupId}`)
  return settlement
}

export async function getGroupSettlements(groupId: string) {
  return prisma.settlement.findMany({
    where: { groupId },
    include: {
      paidBy: true,
      receivedBy: true,
    },
    orderBy: { date: 'desc' },
  })
}

export async function getGroupBalances(groupId: string) {
  return calculateGroupBalances(groupId)
}

