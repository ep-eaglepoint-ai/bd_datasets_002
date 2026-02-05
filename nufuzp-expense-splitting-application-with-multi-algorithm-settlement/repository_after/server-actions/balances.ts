'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

/**
 * Get balances for a group
 */
export async function getBalances(groupId: string) {
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

  return balances
}

/**
 * Get dashboard data (all groups with balances)
 */
export async function getDashboardData() {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
      balances: {
        where: {
          userId: session.user.id,
        },
      },
      _count: {
        select: {
          expenses: true,
          members: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  return groups
}
