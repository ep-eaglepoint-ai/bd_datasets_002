import prisma from "../db";
import type { RuleWithConditions } from "../types";

/**
 * Check if a rule is within its cooldown period
 * Returns true if the rule should be skipped due to cooldown
 */
export async function isWithinCooldown(rule: RuleWithConditions): Promise<boolean> {
  // If no cooldown is set, always allow
  if (rule.cooldownMs <= 0) {
    return false;
  }

  // Find the most recent notification for this rule
  const lastNotification = await prisma.notification.findFirst({
    where: {
      ruleId: rule.id,
      status: "sent",
    },
    orderBy: {
      sentAt: "desc",
    },
    select: {
      sentAt: true,
    },
  });

  // If no previous notification, cooldown doesn't apply
  if (!lastNotification || !lastNotification.sentAt) {
    return false;
  }

  // Calculate time elapsed since last notification
  const now = Date.now();
  const lastSentTime = lastNotification.sentAt.getTime();
  const elapsed = now - lastSentTime;

  // If elapsed time is less than cooldown, skip this notification
  return elapsed < rule.cooldownMs;
}

/**
 * Get the remaining cooldown time in milliseconds
 */
export async function getRemainingCooldown(rule: RuleWithConditions): Promise<number> {
  if (rule.cooldownMs <= 0) {
    return 0;
  }

  const lastNotification = await prisma.notification.findFirst({
    where: {
      ruleId: rule.id,
      status: "sent",
    },
    orderBy: {
      sentAt: "desc",
    },
    select: {
      sentAt: true,
    },
  });

  if (!lastNotification || !lastNotification.sentAt) {
    return 0;
  }

  const now = Date.now();
  const lastSentTime = lastNotification.sentAt.getTime();
  const elapsed = now - lastSentTime;
  const remaining = rule.cooldownMs - elapsed;

  return remaining > 0 ? remaining : 0;
}

/**
 * Format cooldown duration for display
 */
export function formatCooldown(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }
  if (ms < 3600000) {
    return `${Math.round(ms / 60000)}min`;
  }
  return `${Math.round(ms / 3600000)}h`;
}
