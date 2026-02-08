import path from "path";
import { PrismaClient } from "@prisma/client";
import { mockDeep, DeepMockProxy } from "jest-mock-extended";

function loadBalanceModule(repoName: string) {
  const repoRoot = path.resolve(__dirname, "..", "..", repoName);
  const prismaModulePath = path.join(repoRoot, "lib", "prisma");
  const balanceModulePath = path.join(repoRoot, "lib", "balance-utils");

  jest.resetModules();
  jest.doMock(prismaModulePath, () => ({
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
  }));

  const prismaModule = require(prismaModulePath);
  const balanceModule = require(balanceModulePath);

  return {
    prismaMock: prismaModule.prisma as DeepMockProxy<PrismaClient>,
    calculateGroupBalances: balanceModule.calculateGroupBalances as (
      groupId: string,
    ) => Promise<{ userId: string; name: string; balance: number }[]>,
  };
}

export function registerBalanceTests(repoName: string) {
  describe(`Balance Calculations (${repoName})`, () => {
    const groupId = "test-group-id";
    const userIds = Array.from({ length: 50 }, (_, i) => `user-${i}`);

    test("Balance calculation completes within 2 seconds", async () => {
      const { prismaMock, calculateGroupBalances } =
        loadBalanceModule(repoName);

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

      prismaMock.expense.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);
      prismaMock.expenseSplit.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);
      prismaMock.settlement.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);

      const startTime = Date.now();
      const balances = await calculateGroupBalances(groupId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
      expect(balances).toBeDefined();
      expect(balances.length).toBe(50);
    });

    test("Query count is constant (O(1)) and < 20", async () => {
      const { prismaMock, calculateGroupBalances } =
        loadBalanceModule(repoName);

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

      prismaMock.expense.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);
      prismaMock.expenseSplit.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);
      prismaMock.settlement.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);

      await calculateGroupBalances(groupId);

      const totalQueries =
        prismaMock.groupMember.findMany.mock.calls.length +
        prismaMock.expense.groupBy.mock.calls.length +
        prismaMock.expenseSplit.groupBy.mock.calls.length +
        prismaMock.settlement.groupBy.mock.calls.length +
        prismaMock.expense.aggregate.mock.calls.length +
        prismaMock.expenseSplit.aggregate.mock.calls.length +
        prismaMock.settlement.aggregate.mock.calls.length;

      expect(totalQueries).toBeLessThan(20);
      expect(prismaMock.groupMember.findMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.expense.groupBy).toHaveBeenCalledTimes(1);
      expect(prismaMock.expenseSplit.groupBy).toHaveBeenCalledTimes(1);
      expect(prismaMock.settlement.groupBy).toHaveBeenCalledTimes(2);
    });

    test("Memory usage stays under 100MB", async () => {
      const { prismaMock, calculateGroupBalances } =
        loadBalanceModule(repoName);

      prismaMock.groupMember.findMany.mockResolvedValue([]);
      prismaMock.expense.groupBy.mockResolvedValue([]);
      prismaMock.expenseSplit.groupBy.mockResolvedValue([]);
      prismaMock.settlement.groupBy.mockResolvedValue([]);

      prismaMock.expense.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);
      prismaMock.expenseSplit.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);
      prismaMock.settlement.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);

      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      await calculateGroupBalances(groupId);
      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      expect(finalMemory - initialMemory).toBeLessThan(100);
    });

    test("Balance calculation accuracy and formula verification", async () => {
      const { prismaMock, calculateGroupBalances } =
        loadBalanceModule(repoName);
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

      prismaMock.settlement.groupBy.mockResolvedValue([]);

      prismaMock.expense.aggregate.mockResolvedValue({
        _sum: { amount: 100 },
      } as any);
      prismaMock.expenseSplit.aggregate.mockResolvedValue({
        _sum: { amount: 50 },
      } as any);
      prismaMock.settlement.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);

      const balances = await calculateGroupBalances(groupId);

      const b1 = balances.find((b) => b.userId === user1);
      expect(b1?.balance).toBe(50);

      const b2 = balances.find((b) => b.userId === user2);
      expect(b2?.balance).toBe(-50);
    });

    test("Prisma ORM methods only - no raw SQL", async () => {
      const { prismaMock, calculateGroupBalances } =
        loadBalanceModule(repoName);

      prismaMock.groupMember.findMany.mockResolvedValue([]);
      prismaMock.expense.groupBy.mockResolvedValue([]);
      prismaMock.expenseSplit.groupBy.mockResolvedValue([]);
      prismaMock.settlement.groupBy.mockResolvedValue([]);

      prismaMock.expense.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);
      prismaMock.expenseSplit.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);
      prismaMock.settlement.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      } as any);

      await calculateGroupBalances(groupId);

      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
      expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
    });
  });
}
