'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { SplitType } from '@prisma/client'
import { calculateSplit } from '@/lib/splits'
import { recalculateGroupBalances } from '@/lib/balances'

/**
 * Create a new expense with atomic balance updates
 */
export async function createExpense(
  groupId: string,
  paidByUserId: string,
  amountCents: number,
  description: string,
  splitType: SplitType,
  participants: {
    userId: string
    amount?: number
    percentage?: number
    share?: number
  }[]
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

  // Calculate splits
  const splits = calculateSplit(splitType, amountCents, participants)

  // Validate splits sum to total
  const splitSum = splits.reduce((sum, split) => sum + split.amount, 0)
  if (splitSum !== amountCents) {
    throw new Error(`Split amounts (${splitSum}) do not equal total (${amountCents})`)
  }

  // Create expense and splits, then recalculate balances - all in one transaction
  const expense = await prisma.$transaction(async (tx) => {
    // Create expense
    const newExpense = await tx.expense.create({
      data: {
        groupId,
        paidByUserId,
        amount: amountCents,
        description,
        splitType,
        splits: {
          create: splits.map(split => ({
            userId: split.userId,
            amount: split.amount,
            percentage: split.percentage ?? null,
            share: split.share ?? null,
          })),
        },
      },
      include: {
        splits: {
          include: {
            user: true,
          },
        },
        paidBy: true,
      },
    })

    // Recalculate balances atomically
    await recalculateGroupBalances(groupId, tx)

    return newExpense
  })

  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/expenses`)
  
  return expense
}

/**
 * Update an expense with atomic balance recalculation
 */
export async function updateExpense(
  expenseId: string,
  amountCents: number,
  description: string,
  splitType: SplitType,
  participants: {
    userId: string
    amount?: number
    percentage?: number
    share?: number
  }[]
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Get existing expense
  const existingExpense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      group: {
        include: {
          members: {
            where: {
              userId: session.user.id,
            },
          },
        },
      },
    },
  })

  if (!existingExpense) {
    throw new Error('Expense not found')
  }

  if (existingExpense.group.members.length === 0) {
    throw new Error('Not a member of this group')
  }

  const groupId = existingExpense.groupId

  // Calculate new splits
  const splits = calculateSplit(splitType, amountCents, participants)

  // Validate splits sum to total
  const splitSum = splits.reduce((sum, split) => sum + split.amount, 0)
  if (splitSum !== amountCents) {
    throw new Error(`Split amounts (${splitSum}) do not equal total (${amountCents})`)
  }

  // Update expense and recalculate balances - all in one transaction
  const expense = await prisma.$transaction(async (tx) => {
    // Delete old splits
    await tx.expenseSplit.deleteMany({
      where: { expenseId },
    })

    // Update expense and create new splits
    const updatedExpense = await tx.expense.update({
      where: { id: expenseId },
      data: {
        amount: amountCents,
        description,
        splitType,
        splits: {
          create: splits.map(split => ({
            userId: split.userId,
            amount: split.amount,
            percentage: split.percentage ?? null,
            share: split.share ?? null,
          })),
        },
      },
      include: {
        splits: {
          include: {
            user: true,
          },
        },
        paidBy: true,
      },
    })

    // Recalculate balances atomically
    await recalculateGroupBalances(groupId, tx)

    return updatedExpense
  })

  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/expenses`)
  
  return expense
}

/**
 * Delete an expense with atomic balance recalculation
 */
export async function deleteExpense(expenseId: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Get existing expense
  const existingExpense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      group: {
        include: {
          members: {
            where: {
              userId: session.user.id,
            },
          },
        },
      },
    },
  })

  if (!existingExpense) {
    throw new Error('Expense not found')
  }

  if (existingExpense.group.members.length === 0) {
    throw new Error('Not a member of this group')
  }

  const groupId = existingExpense.groupId

  // Delete expense and recalculate balances - all in one transaction
  await prisma.$transaction(async (tx) => {
    // Delete expense (cascades to splits)
    await tx.expense.delete({
      where: { id: expenseId },
    })

    // Recalculate balances atomically
    await recalculateGroupBalances(groupId, tx)
  })

  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/expenses`)
  
  return { success: true }
}

/**
 * Get a single expense by ID
 */
export async function getExpense(expenseId: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      splits: {
        include: {
          user: true,
        },
      },
      paidBy: true,
      group: {
        include: {
          members: {
            where: {
              userId: session.user.id,
            },
          },
        },
      },
    },
  })

  if (!expense) {
    throw new Error('Expense not found')
  }

  if (expense.group.members.length === 0) {
    throw new Error('Not a member of this group')
  }

  return expense
}

/**
 * Get all expenses for a group
 */
export async function getGroupExpenses(groupId: string) {
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

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      splits: {
        include: {
          user: true,
        },
      },
      paidBy: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return expenses
}
