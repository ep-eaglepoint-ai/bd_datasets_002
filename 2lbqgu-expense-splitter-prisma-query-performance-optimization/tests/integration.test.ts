import { PrismaClient } from "@prisma/client";
import { mockDeep, DeepMockProxy } from "jest-mock-extended";
import { calculateGroupBalances } from "../repository_after/lib/balance-utils";
import { prisma } from "../repository_after/lib/prisma";

jest.mock("../repository_after/lib/prisma", () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

describe("Integration Tests - Mocked Database", () => {
  const groupId = "test-group-id";
  const userIds = Array.from({ length: 50 }, (_, i) => `user-${i}`);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Balance calculation completes within 2 seconds", async () => {
    // Setup mock data
    prismaMock.groupMember.findMany.mockResolvedValue(
      userIds.map((id) => ({
        id: `member-${id}`,
        groupId,
        userId: id,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id,
          email: `${id}@test.com`,
          name: `User ${id}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })),
    );

    prismaMock.expense.groupBy.mockResolvedValue([]);
    prismaMock.expenseSplit.groupBy.mockResolvedValue([]);
    prismaMock.settlement.groupBy.mockResolvedValue([]);

    const startTime = Date.now();

    const balances = await calculateGroupBalances(groupId);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(2000); // Requirement 1
    expect(balances).toBeDefined();
    expect(balances.length).toBe(50);
  });

  test("Query count is constant (O(1)) and < 20", async () => {
    // Setup mock returns
    prismaMock.groupMember.findMany.mockResolvedValue([]);
    prismaMock.expense.groupBy.mockResolvedValue([]);
    prismaMock.expenseSplit.groupBy.mockResolvedValue([]);
    prismaMock.settlement.groupBy.mockResolvedValue([]);

    await calculateGroupBalances(groupId);

    const totalQueries =
      prismaMock.groupMember.findMany.mock.calls.length +
      prismaMock.expense.groupBy.mock.calls.length +
      prismaMock.expenseSplit.groupBy.mock.calls.length +
      prismaMock.settlement.groupBy.mock.calls.length;

    expect(totalQueries).toBe(5);
    expect(totalQueries).toBeLessThan(20); // Requirement 3

    expect(prismaMock.groupMember.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.expense.groupBy).toHaveBeenCalledTimes(1);
    expect(prismaMock.expenseSplit.groupBy).toHaveBeenCalledTimes(1);
    expect(prismaMock.settlement.groupBy).toHaveBeenCalledTimes(2);
  });

  test("Memory usage stays under 100MB", async () => {
    prismaMock.groupMember.findMany.mockResolvedValue([]);
    prismaMock.expense.groupBy.mockResolvedValue([]);
    prismaMock.expenseSplit.groupBy.mockResolvedValue([]);
    prismaMock.settlement.groupBy.mockResolvedValue([]);

    const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    await calculateGroupBalances(groupId);
    const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    expect(finalMemory - initialMemory).toBeLessThan(100);
  });

  test("Balance calculation accuracy and formula verification", async () => {
    const user1 = "user-1";
    const user2 = "user-2";

    prismaMock.groupMember.findMany.mockResolvedValue([
      { userId: user1, user: { name: "User 1" } } as any,
      { userId: user2, user: { name: "User 2" } } as any,
    ]);

    prismaMock.expense.groupBy.mockResolvedValue([
      { paidById: user1, _sum: { amount: 100 } },
    ] as any);

    prismaMock.expenseSplit.groupBy.mockResolvedValue([
      { userId: user1, _sum: { amount: 50 } },
      { userId: user2, _sum: { amount: 50 } },
    ] as any);

    prismaMock.settlement.groupBy.mockResolvedValue([]); // No settlements

    const balances = await calculateGroupBalances(groupId);

    const b1 = balances.find((b) => b.userId === user1);
    expect(b1?.balance).toBe(50);

    const b2 = balances.find((b) => b.userId === user2);
    expect(b2?.balance).toBe(-50);
  });

  test("Prisma ORM methods only - no raw SQL", async () => {
    prismaMock.groupMember.findMany.mockResolvedValue([]);
    prismaMock.expense.groupBy.mockResolvedValue([]);
    prismaMock.expenseSplit.groupBy.mockResolvedValue([]);
    prismaMock.settlement.groupBy.mockResolvedValue([]);

    await calculateGroupBalances(groupId);

    // Check that $queryRaw and $queryRawUnsafe were not called
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});
