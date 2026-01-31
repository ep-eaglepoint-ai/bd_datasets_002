import type { Rule, Condition, Event, Notification } from "@/generated/prisma/client";

export type { Rule, Condition, Event, Notification };

export type RuleWithConditions = Rule & {
  conditions: Condition[];
};

export type NotificationWithRelations = Notification & {
  rule: Rule;
  event: Event;
};

export type EventPayload = Record<string, unknown>;

export type Operator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains";

export type Priority = "low" | "medium" | "high" | "critical";

export type Channel = "in-app" | "webhook";

export type NotificationStatus = "pending" | "sent" | "failed";

export interface NotificationPayload {
  ruleId: string;
  ruleName: string;
  eventId: string;
  eventType: string;
  eventPayload: EventPayload;
  priority: Priority;
  channel: Channel;
  webhookUrl?: string;
}

export interface SendResult {
  success: boolean;
  channel: Channel;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface EvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  skippedReason?: "cooldown" | "disabled" | "conditions_not_met";
  notifications?: Notification[];
}

export interface ConditionEvaluationResult {
  passed: boolean;
  field: string;
  operator: Operator;
  expectedValue: string;
  actualValue: unknown;
}
