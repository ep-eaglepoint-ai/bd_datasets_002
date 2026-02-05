import prisma from "../db";
import type {
  EventPayload,
  RuleWithConditions,
  EvaluationResult,
  Channel,
  Priority,
  Notification,
} from "../types";
import { evaluateAllConditions } from "./condition-matcher";
import { isWithinCooldown } from "./cooldown-manager";
import { dispatchToAllChannels } from "./channel-dispatcher";

/**
 * Fetch all enabled rules that match a given event type
 */
export async function getRulesForEventType(eventType: string): Promise<RuleWithConditions[]> {
  const rules = await prisma.rule.findMany({
    where: {
      eventType,
      enabled: true,
    },
    include: {
      conditions: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return rules;
}

/**
 * Evaluate a single rule against an event payload
 */
export async function evaluateRule(
  rule: RuleWithConditions,
  eventId: string,
  payload: EventPayload
): Promise<EvaluationResult> {
  // Check if rule is within cooldown
  const inCooldown = await isWithinCooldown(rule);
  if (inCooldown) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      skippedReason: "cooldown",
    };
  }

  // Evaluate all conditions
  const { passed } = evaluateAllConditions(rule.conditions, payload);
  if (!passed) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      skippedReason: "conditions_not_met",
    };
  }

  // Parse channels from JSON string
  let channels: Channel[];
  try {
    channels = JSON.parse(rule.channels) as Channel[];
  } catch {
    channels = ["in-app"];
  }

  // Dispatch notifications to all channels
  const results = await dispatchToAllChannels(
    {
      ruleId: rule.id,
      ruleName: rule.name,
      eventId,
      eventType: rule.eventType,
      eventPayload: payload,
      priority: rule.priority as Priority,
      webhookUrl: rule.webhookUrl || undefined,
    },
    channels
  );

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    matched: true,
    notifications: results.map((r) => r.notification),
  };
}

/**
 * Process an incoming event:
 * 1. Store the event in the database
 * 2. Fetch all matching rules
 * 3. Evaluate each rule
 * 4. Create notifications for matched rules
 */
export async function processEvent(
  eventType: string,
  payload: EventPayload
): Promise<{
  event: { id: string; eventType: string };
  results: EvaluationResult[];
}> {
  // Store the event
  const event = await prisma.event.create({
    data: {
      eventType,
      payload: JSON.stringify(payload),
    },
  });

  // Fetch rules for this event type
  const rules = await getRulesForEventType(eventType);

  // Evaluate each rule
  const results: EvaluationResult[] = [];
  for (const rule of rules) {
    const result = await evaluateRule(rule, event.id, payload);
    results.push(result);
  }

  return {
    event: {
      id: event.id,
      eventType: event.eventType,
    },
    results,
  };
}

/**
 * Test an event against rules without storing or sending notifications
 * Used for the test screen to preview which rules would match
 */
export async function testEvent(
  eventType: string,
  payload: EventPayload
): Promise<{
  matchedRules: Array<{
    rule: RuleWithConditions;
    conditionResults: Array<{
      field: string;
      operator: string;
      expected: string;
      actual: unknown;
      passed: boolean;
    }>;
  }>;
  unmatchedRules: Array<{
    rule: RuleWithConditions;
    reason: string;
    conditionResults?: Array<{
      field: string;
      operator: string;
      expected: string;
      actual: unknown;
      passed: boolean;
    }>;
  }>;
}> {
  const rules = await getRulesForEventType(eventType);

  const matchedRules: Array<{
    rule: RuleWithConditions;
    conditionResults: Array<{
      field: string;
      operator: string;
      expected: string;
      actual: unknown;
      passed: boolean;
    }>;
  }> = [];

  const unmatchedRules: Array<{
    rule: RuleWithConditions;
    reason: string;
    conditionResults?: Array<{
      field: string;
      operator: string;
      expected: string;
      actual: unknown;
      passed: boolean;
    }>;
  }> = [];

  for (const rule of rules) {
    // Check cooldown (but don't skip for test mode, just note it)
    const inCooldown = await isWithinCooldown(rule);

    // Evaluate conditions
    const { passed, results } = evaluateAllConditions(rule.conditions, payload);

    const conditionResults = results.map((r) => ({
      field: r.field,
      operator: r.operator,
      expected: r.expectedValue,
      actual: r.actualValue,
      passed: r.passed,
    }));

    if (passed) {
      matchedRules.push({
        rule,
        conditionResults,
      });

      // Note if it would be skipped due to cooldown in production
      if (inCooldown) {
        unmatchedRules.push({
          rule,
          reason: "Would be skipped due to cooldown in production",
          conditionResults,
        });
      }
    } else {
      unmatchedRules.push({
        rule,
        reason: "Conditions not met",
        conditionResults,
      });
    }
  }

  return { matchedRules, unmatchedRules };
}
