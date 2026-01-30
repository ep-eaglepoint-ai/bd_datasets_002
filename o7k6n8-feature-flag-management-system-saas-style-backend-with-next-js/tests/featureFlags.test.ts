import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { evaluateFlagForUser, getEvaluatedFlagsForUser } from '../repository_after/src/lib/featureFlags';

const prisma = new PrismaClient();

describe('Feature Flag Evaluation', () => {
  let user1: any;
  let user2: any;
  let flag1: any;
  let flag2: any;

  beforeAll(async () => {
    // Create test users
    user1 = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        password: 'hashedpass',
        role: 'USER',
      },
    });

    user2 = await prisma.user.create({
      data: {
        email: 'user2@example.com',
        password: 'hashedpass',
        role: 'USER',
      },
    });

    // Create test flags
    flag1 = await prisma.featureFlag.create({
      data: {
        key: 'test_flag_1',
        description: 'Test flag 1',
        enabled: true,
        rolloutPercentage: 50,
      },
    });

    flag2 = await prisma.featureFlag.create({
      data: {
        key: 'test_flag_2',
        description: 'Test flag 2',
        enabled: false,
        rolloutPercentage: 100,
      },
    });
  });

  afterAll(async () => {
    await prisma.userOverride.deleteMany();
    await prisma.featureFlag.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Flag evaluation logic', () => {
    it('should return false for disabled flag', () => {
      const result = evaluateFlagForUser(flag2, user1.id);
      expect(result).toBe(false);
    });

    it('should return true for enabled flag with 100% rollout', () => {
      const flag100 = { ...flag1, rolloutPercentage: 100 };
      const result = evaluateFlagForUser(flag100, user1.id);
      expect(result).toBe(true);
    });

    it('should return false for enabled flag with 0% rollout', () => {
      const flag0 = { ...flag1, rolloutPercentage: 0 };
      const result = evaluateFlagForUser(flag0, user1.id);
      expect(result).toBe(false);
    });

    it('should be deterministic for same user and flag', () => {
      const result1 = evaluateFlagForUser(flag1, user1.id);
      const result2 = evaluateFlagForUser(flag1, user1.id);
      expect(result1).toBe(result2);
    });

    it('should handle user overrides', async () => {
      // Create override
      await prisma.userOverride.create({
        data: {
          userId: user1.id,
          flagId: flag1.id,
          enabled: true,
        },
      });

      const flagWithOverride = {
        ...flag1,
        overrides: [{ userId: user1.id, enabled: true }],
      };

      const result = evaluateFlagForUser(flagWithOverride, user1.id);
      expect(result).toBe(true);

      // Clean up
      await prisma.userOverride.deleteMany({
        where: { userId: user1.id, flagId: flag1.id },
      });
    });
  });

  describe('Bulk flag evaluation', () => {
    it('should return evaluated flags for user', async () => {
      const flags = await getEvaluatedFlagsForUser(user1.id);
      expect(typeof flags).toBe('object');
      expect(flags).toHaveProperty('test_flag_1');
      expect(flags).toHaveProperty('test_flag_2');
      expect(flags.test_flag_2).toBe(false); // disabled flag
    });
  });
});
