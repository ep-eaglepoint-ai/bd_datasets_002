'use server'

import { prisma } from '@/lib/prisma'
import { getUserBalanceInGroup } from '@/lib/balance-utils'
import { revalidatePath } from 'next/cache'

export async function createGroup({ name, description }: { name: string; description?: string }) {
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: { email: 'demo@example.com', name: 'Demo User' },
  })

  const group = await prisma.$transaction(async (tx) => {
    const newGroup = await tx.group.create({
      data: {
        name,
        description: description || null,
      },
    })

    await tx.groupMember.create({
      data: {
        groupId: newGroup.id,
        userId: demoUser.id,
        isAdmin: true,
      },
    })

    return newGroup
  })

  revalidatePath('/groups')
  return group
}

export async function addMemberToGroup({ groupId, email, name }: { groupId: string; email: string; name?: string }) {
  let user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    user = await prisma.user.create({
      data: { email, name: name || email.split('@')[0] },
    })
  }

  const existingMember = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId, userId: user.id },
    },
  })

  if (existingMember) {
    throw new Error('User is already a member of this group')
  }

  await prisma.groupMember.create({
    data: {
      groupId,
      userId: user.id,
      isAdmin: false,
    },
  })

  revalidatePath(`/groups/${groupId}`)
  return user
}

export async function leaveGroup(groupId: string, userId: string) {
  const balance = await getUserBalanceInGroup(groupId, userId)

  if (balance !== 0) {
    throw new Error(`Cannot leave group with non-zero balance. Current balance: ${balance} cents`)
  }

  await prisma.groupMember.delete({
    where: {
      groupId_userId: { groupId, userId },
    },
  })

  revalidatePath(`/groups/${groupId}`)
  revalidatePath('/groups')
}

export async function getGroup(groupId: string) {
  return prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: true },
      },
    },
  })
}

export async function getUserGroups(userId: string) {
  return prisma.group.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    include: {
      members: {
        include: { user: true },
      },
      _count: {
        select: { expenses: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

