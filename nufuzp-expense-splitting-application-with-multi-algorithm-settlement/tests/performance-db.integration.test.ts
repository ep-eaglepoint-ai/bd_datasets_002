/**
 * Requirement 7: Performance at scale (real stack)
 * Measures actual DB + Prisma path for:
 * - recalculateGroupBalances(groupId) with 50 members and 10,000 expenses
 * - getGroupBalances(groupId) under max-size (50 members)
 *
 * Requires DATABASE_URL. Skips when not set so unit-only runs still pass.
 * Seed creates 50 users, 1 group with 50 members, 10,000 expenses with 50 splits each.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { recalculateGroupBalances, getGroupBalances } from '@/lib/balances'
import { GroupMemberRole } from '@prisma/client'

const HAS_DB = Boolean(process.env.DATABASE_URL)
const MEMBER_COUNT = 50
const EXPENSE_COUNT = 10000
const MAX_RECALC_MS = 2000 // Requirement: recalculate within 2 seconds
const MAX_GET_BALANCES_MS = 2000 // dashboard/group balances under max-size

describe('Requirement 7: Performance at scale (real stack)', () => {
  let testGroupId: string
  const userIds: string[] = []
  const testEmailPrefix = `perf-db-${Date.now()}`

  beforeAll(async () => {
    if (!HAS_DB) return

    // Create 50 users
    for (let i = 0; i < MEMBER_COUNT; i++) {
      const u = await prisma.user.create({
        data: {
          email: `${testEmailPrefix}-u${i}@test.local`,
          name: `Perf User ${i}`,
        },
      })
      userIds.push(u.id)
    }

    // Create group with 50 members
    const group = await prisma.group.create({
      data: {
        name: 'Performance Test Group',
        description: '50 members, 10k expenses',
        members: {
          create: userIds.map((userId, i) => ({
            userId,
            role: i === 0 ? GroupMemberRole.OWNER : GroupMemberRole.MEMBER,
          })),
        },
      },
    })
    testGroupId = group.id

    // Create 10,000 expenses with 50 splits each (EQUAL: 1000 cents / 50 = 20 cents per person)
    const BATCH_SIZE = 100
    const numBatches = Math.ceil(EXPENSE_COUNT / BATCH_SIZE)
    for (let b = 0; b < numBatches; b++) {
      await prisma.$transaction(
        async (tx) => {
          for (let i = 0; i < BATCH_SIZE && b * BATCH_SIZE + i < EXPENSE_COUNT; i++) {
            const idx = b * BATCH_SIZE + i
            await tx.expense.create({
              data: {
                groupId: testGroupId,
                paidByUserId: userIds[idx % MEMBER_COUNT],
                amount: 1000,
                description: `Perf expense ${idx}`,
                splitType: 'EQUAL',
                splits: {
                  create: userIds.map((uid) => ({ userId: uid, amount: 20 })),
                },
              },
            })
          }
        },
        { timeout: 60000 }
      )
    }
  }, 300000) // 5 min timeout for seed

  afterAll(async () => {
    if (!HAS_DB) return

    try {
      await prisma.expense.deleteMany({ where: { groupId: testGroupId } })
      await prisma.balance.deleteMany({ where: { groupId: testGroupId } })
      await prisma.groupMember.deleteMany({ where: { groupId: testGroupId } })
      await prisma.group.delete({ where: { id: testGroupId } })
      for (const uid of userIds) {
        await prisma.user.delete({ where: { id: uid } }).catch(() => {})
      }
    } catch {
      // Ignore cleanup errors
    }
  })

  it.runIf(HAS_DB)(
    'recalculateGroupBalances for 50 members and 10,000 expenses completes within 2 seconds (real DB)',
    async () => {
      const start = performance.now()
      await prisma.$transaction(async (tx) => {
        await recalculateGroupBalances(testGroupId, tx)
      })
      const duration = performance.now() - start

      console.log(
        `[DB] recalculateGroupBalances: ${EXPENSE_COUNT} expenses, ${MEMBER_COUNT} members → ${duration.toFixed(2)}ms`
      )
      expect(duration).toBeLessThan(MAX_RECALC_MS)
    },
    MAX_RECALC_MS + 5000
  )

  it.runIf(HAS_DB)(
    'getGroupBalances under max-size (50 members) completes within 2 seconds',
    async () => {
      // Ensure balances exist (run recalc once if needed)
      const balanceCount = await prisma.balance.count({
        where: { groupId: testGroupId },
      })
      if (balanceCount === 0) {
        await prisma.$transaction(async (tx) => {
          await recalculateGroupBalances(testGroupId, tx)
        })
      }

      const start = performance.now()
      const balances = await getGroupBalances(testGroupId)
      const duration = performance.now() - start

      console.log(
        `[DB] getGroupBalances: ${balances.length} members → ${duration.toFixed(2)}ms`
      )
      expect(balances).toHaveLength(MEMBER_COUNT)
      expect(duration).toBeLessThan(MAX_GET_BALANCES_MS)
    },
    MAX_GET_BALANCES_MS + 5000
  )
})
