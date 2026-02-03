import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export function evaluateFlagForUser(flag: any, userId: string): boolean {
  // Check for user override first (highest priority)
  const override = flag.overrides?.find((o: any) => o.userId === userId);
  if (override) {
    return override.enabled;
  }

  // If flag is globally disabled, return false
  if (!flag.enabled) {
    return false;
  }

  // If rollout percentage is 0, return false
  if (flag.rolloutPercentage === 0) {
    return false;
  }

  // If rollout percentage is 100, return true
  if (flag.rolloutPercentage === 100) {
    return true;
  }

  // Deterministic rollout based on userId and flag key
  const hash = crypto.createHash('sha256').update(`${userId}:${flag.key}`).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  const percentage = (hashInt % 100) + 1; // 1-100

  return percentage <= flag.rolloutPercentage;
}

export async function getEvaluatedFlagsForUser(userId: string): Promise<Record<string, boolean>> {
  const flags = await prisma.featureFlag.findMany({
    include: {
      overrides: {
        where: { userId },
      },
    },
  });

  const result: Record<string, boolean> = {};
  for (const flag of flags) {
    result[flag.key] = evaluateFlagForUser(flag, userId);
  }

  return result;
}