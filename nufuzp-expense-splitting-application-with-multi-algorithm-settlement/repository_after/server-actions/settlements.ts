'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { recalculateGroupBalances } from '@/lib/balances'
import { calculateMinimumSettlements, UserBalance } from '@/lib/settlement'

/**
 * Get settlement suggestions for a group
 */
export async function getSettlementSuggestions(groupId: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Verify user is a member
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
  })

  if (!membership) {
    throw new Error('Not a member of this group')
  }

  // Get current balances
  const balances = await prisma.balance.findMany({
    where: { groupId },
    include: {
      user: true,
    },
  })

  const userBalances: UserBalance[] = balances.map((b: { userId: string; amount: number }) => ({
    userId: b.userId,
    amount: b.amount,
  }))

  // Calculate minimum settlements
  const suggestions = calculateMinimumSettlements(userBalances)

  // Enrich with user info
  const enrichedSuggestions = suggestions.map(suggestion => {
    const fromUser = balances.find((b) => b.userId === suggestion.fromUserId)?.user
    const toUser = balances.find((b) => b.userId === suggestion.toUserId)?.user

    return {
      ...suggestion,
      fromUser: fromUser ? {
        id: fromUser.id,
        name: fromUser.name,
        email: fromUser.email,
      } : null,
      toUser: toUser ? {
        id: toUser.id,
        name: toUser.name,
        email: toUser.email,
      } : null,
    }
  })

  return enrichedSuggestions
}

/**
 * Record a settlement (payment between users)
 */
export async function recordSettlement(
  groupId: string,
  fromUserId: string,
  toUserId: string,
  amountCents: number
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Verify user is a member
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
  })

  if (!membership) {
    throw new Error('Not a member of this group')
  }

  // Validate amount
  if (amountCents <= 0) {
    throw new Error('Settlement amount must be positive')
  }

  // Create settlement and recalculate balances - all in one transaction
  const settlement = await prisma.$transaction(async (tx) => {
    // Create settlement
    const newSettlement = await tx.settlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amount: amountCents,
      },
      include: {
        fromUser: true,
        toUser: true,
      },
    })

    // Recalculate balances atomically
    await recalculateGroupBalances(groupId, tx)

    return newSettlement
  })

  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/settlements`)
  
  return settlement
}

/**
 * Get all settlements for a group
 */
export async function getGroupSettlements(groupId: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Verify user is a member
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
  })

  if (!membership) {
    throw new Error('Not a member of this group')
  }

  const settlements = await prisma.settlement.findMany({
    where: { groupId },
    include: {
      fromUser: true,
      toUser: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return settlements
}
