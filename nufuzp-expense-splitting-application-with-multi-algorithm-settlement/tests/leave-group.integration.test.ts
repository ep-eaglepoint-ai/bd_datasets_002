/**
 * Requirement 6: Leave group rule – integration test
 * Calls the real leaveGroup server action with DB data and asserts:
 * - Non-zero balance → error message and blocking (member not removed)
 * - Zero balance → success (member removed)
 *
 * Requires DATABASE_URL. Skips when not set so unit-only runs still pass.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { leaveGroup } from '@/server-actions/groups'
import { GroupMemberRole } from '@prisma/client'

const HAS_DB = Boolean(process.env.DATABASE_URL)

// Mutable ref so mock auth() returns the test user id set in beforeAll
const mockSessionUserId = { current: '' }

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() =>
    Promise.resolve(
      mockSessionUserId.current
        ? { user: { id: mockSessionUserId.current } }
        : null
    )
  ),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}))

describe('Requirement 6: Leave group rule (integration)', () => {
  let testUserId: string
  let testGroupId: string
  const testEmail = `leave-group-test-${Date.now()}@test.local`

  beforeAll(async () => {
    if (!HAS_DB) return

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Leave Group Test User',
      },
    })
    testUserId = user.id
    mockSessionUserId.current = testUserId

    const group = await prisma.group.create({
      data: {
        name: 'Leave Group Test',
        description: 'Integration test group',
        members: {
          create: {
            userId: testUserId,
            role: GroupMemberRole.OWNER,
          },
        },
      },
    })
    testGroupId = group.id
  })

  afterAll(async () => {
    if (!HAS_DB) return

    mockSessionUserId.current = ''
    try {
      await prisma.balance.deleteMany({ where: { groupId: testGroupId } })
      await prisma.groupMember.deleteMany({ where: { groupId: testGroupId } })
      await prisma.group.delete({ where: { id: testGroupId } })
      await prisma.user.delete({ where: { id: testUserId } })
    } catch {
      // Ignore cleanup errors
    }
  })

  it.runIf(HAS_DB)(
    'blocks leave when balance is non-zero and throws with settle/owe message',
    async () => {
      await prisma.balance.upsert({
        where: {
          groupId_userId: { groupId: testGroupId, userId: testUserId },
        },
        create: {
          groupId: testGroupId,
          userId: testUserId,
          amount: 500, // $5.00 owed
        },
        update: { amount: 500 },
      })

      let thrown: Error | undefined
      await leaveGroup(testGroupId).catch((e) => {
        thrown = e instanceof Error ? e : new Error(String(e))
      })
      expect(thrown).toBeDefined()
      expect(thrown!.message).toMatch(/settle|owe|owed|balance|debt/i)
      expect(thrown!.message).toMatch(/5\.00/) // dollar amount in message

      const stillMember = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: { groupId: testGroupId, userId: testUserId },
        },
      })
      expect(stillMember).not.toBeNull()
    }
  )

  it.runIf(HAS_DB)(
    'allows leave when balance is zero and removes membership',
    async () => {
      // After "block leave" test we still have membership; set balance to 0
      await prisma.balance.upsert({
        where: {
          groupId_userId: { groupId: testGroupId, userId: testUserId },
        },
        create: {
          groupId: testGroupId,
          userId: testUserId,
          amount: 0,
        },
        update: { amount: 0 },
      })

      const result = await leaveGroup(testGroupId)
      expect(result).toEqual({ success: true })

      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: { groupId: testGroupId, userId: testUserId },
        },
      })
      expect(membership).toBeNull()
    }
  )
})
