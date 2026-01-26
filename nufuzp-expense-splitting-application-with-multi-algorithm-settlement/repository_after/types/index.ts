import { SplitType, GroupMemberRole } from '@prisma/client'

export type { SplitType, GroupMemberRole }

export interface User {
  id: string
  email: string
  name: string | null
  emailVerified: Date | null
}

export interface Group {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  role: GroupMemberRole
  joinedAt: Date
  user?: User
}

export interface Expense {
  id: string
  groupId: string
  paidByUserId: string
  amount: number // in cents
  description: string
  splitType: SplitType
  createdAt: Date
  updatedAt: Date
  splits?: ExpenseSplit[]
  paidBy?: User
}

export interface ExpenseSplit {
  id: string
  expenseId: string
  userId: string
  amount: number // in cents
  percentage: number | null
  share: number | null
  user?: User
}

export interface Settlement {
  id: string
  groupId: string
  fromUserId: string
  toUserId: string
  amount: number // in cents
  createdAt: Date
  fromUser?: User
  toUser?: User
}

export interface Balance {
  id: string
  groupId: string
  userId: string
  amount: number // in cents (positive = owed money, negative = owes money)
  user?: User
}
