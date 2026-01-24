'use server'

import { prisma } from '@/lib/prisma'
import { calculateSplits, SplitInput } from '@/lib/split-utils'
import { SplitType } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export interface CreateExpenseInput {
  groupId: string
  paidById: string
  amount: number
  description: string
  splitType: SplitType
  participants: SplitInput[]
}

export async function createExpense(input: CreateExpenseInput) {
  const { groupId, paidById, amount, description, splitType, participants } = input

  if (amount <= 0) {
    throw new Error('Amount must be positive')
  }

  if (participants.length === 0) {
    throw new Error('At least one participant is required')
  }

  const splits = calculateSplits(amount, splitType, participants)

  const splitSum = splits.reduce((acc, s) => acc + s.amount, 0)
  if (splitSum !== amount) {
    throw new Error(`Split sum (${splitSum}) does not match total (${amount})`)
  }

  const expense = await prisma.$transaction(async (tx) => {
    const newExpense = await tx.expense.create({
      data: {
        groupId,
        paidById,
        amount,
        description,
        splitType,
      },
    })

    await tx.expenseSplit.createMany({
      data: splits.map(split => ({
        expenseId: newExpense.id,
        userId: split.userId,
        amount: split.amount,
        percentage: split.percentage,
        share: split.share,
      })),
    })

    return newExpense
  })

  revalidatePath(`/groups/${groupId}`)
  return expense
}

export async function deleteExpense(expenseId: string, groupId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.expenseSplit.deleteMany({
      where: { expenseId },
    })

    await tx.expense.delete({
      where: { id: expenseId },
    })
  })

  revalidatePath(`/groups/${groupId}`)
}

export async function getGroupExpenses(groupId: string) {
  return prisma.expense.findMany({
    where: { groupId },
    include: {
      paidBy: true,
      splits: {
        include: { user: true },
      },
    },
    orderBy: { date: 'desc' },
  })
}

