'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { GroupMemberRole } from '@prisma/client'

/**
 * Create a new group
 */
export async function createGroup(name: string, description?: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const group = await prisma.group.create({
    data: {
      name,
      description: description || null,
      members: {
        create: {
          userId: session.user.id,
          role: GroupMemberRole.OWNER,
        },
      },
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  })

  revalidatePath('/dashboard')
  revalidatePath('/groups')
  
  return group
}

/**
 * Get all groups for the current user
 */
export async function getUserGroups() {
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

/**
 * Get a single group by ID
 */
export async function getGroup(groupId: string) {
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

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  })

  return group
}

/**
 * Invite a user to a group by email
 */
export async function inviteToGroup(groupId: string, email: string) {
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

  // Find or create user by email
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    // Create user if they don't exist (they'll need to sign up first)
    throw new Error('User not found. They need to sign up first.')
  }

  // Check if already a member
  const existingMember = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id,
      },
    },
  })

  if (existingMember) {
    throw new Error('User is already a member of this group')
  }

  // Add member
  await prisma.groupMember.create({
    data: {
      groupId,
      userId: user.id,
      role: GroupMemberRole.MEMBER,
    },
  })

  revalidatePath(`/groups/${groupId}`)
  
  return { success: true }
}

/**
 * Leave a group (only if balance is zero)
 */
export async function leaveGroup(groupId: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Check balance
  const balance = await prisma.balance.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
  })

  if (balance && balance.amount !== 0) {
    const debtAmount = Math.abs(balance.amount / 100).toFixed(2);
    const message = balance.amount > 0 
      ? `You are still owed $${debtAmount}. Please settle all balances before leaving.`
      : `You still owe $${debtAmount}. Please settle all debts before leaving.`;
    throw new Error(message);
  }

  // Check if user is the owner
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
  })

  if (membership?.role === GroupMemberRole.OWNER) {
    // Check if there are other members
    const memberCount = await prisma.groupMember.count({
      where: { groupId },
    })

    if (memberCount > 1) {
      throw new Error('Group owner cannot leave if there are other members. Transfer ownership first.')
    }
  }

  // Remove member
  await prisma.groupMember.delete({
    where: {
      groupId_userId: {
        groupId,
        userId: session.user.id,
      },
    },
  })

  revalidatePath('/dashboard')
  revalidatePath('/groups')
  
  return { success: true }
}
