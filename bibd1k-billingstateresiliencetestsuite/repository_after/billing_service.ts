/**
 * Billing state machine with resilience to out-of-order and duplicate events.
 */
import { assert } from "https://deno.land/std@0.208.0/assert/mod.ts";

export type SubscriptionState =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "GRACE_PERIOD"
  | "CANCELED";

export interface BillingEvent {
  id: string;
  type:
    | "PAYMENT_SUCCESS"
    | "PAYMENT_FAILURE"
    | "SUBSCRIPTION_CREATED"
    | "SUBSCRIPTION_CANCELLED";
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface Subscription {
  id: string;
  status: SubscriptionState;
  lastProcessedTimestamp: number;
  metadata: Record<string, string>;
}

export class BillingService {
  private subscriptions: Map<string, Subscription> = new Map();

  getSubscription(id: string): Subscription | undefined {
    return this.subscriptions.get(id);
  }

  processEvent(subscriptionId: string, event: BillingEvent): void {
    let sub = this.subscriptions.get(subscriptionId);

    if (!sub) {
      if (event.type === "SUBSCRIPTION_CREATED") {
        sub = {
          id: subscriptionId,
          status: "TRIALING",
          lastProcessedTimestamp: event.timestamp,
          metadata: {},
        };
        this.subscriptions.set(subscriptionId, sub);
        return;
      }
      throw new Error("Subscription not found");
    }

    // Special handling for SUBSCRIPTION_CANCELLED - always process regardless of timestamp
    // because cancellation is a terminal business event that should always be honored
    if (event.type === "SUBSCRIPTION_CANCELLED") {
      sub.status = "CANCELED";
      // Update timestamp only if this event is newer to maintain temporal coherence
      if (event.timestamp > sub.lastProcessedTimestamp) {
        sub.lastProcessedTimestamp = event.timestamp;
      }
      return;
    }

    // Guard against stale or duplicate events
    if (event.timestamp <= sub.lastProcessedTimestamp) {
      return;
    }

    // Terminal state protection
    if (sub.status === "CANCELED") {
      return;
    }

    switch (event.type) {
      case "PAYMENT_SUCCESS":
        sub.status = "ACTIVE";
        break;
      case "PAYMENT_FAILURE":
        if (sub.status === "ACTIVE" || sub.status === "TRIALING") {
          sub.status = "PAST_DUE";
        } else if (sub.status === "PAST_DUE") {
          sub.status = "GRACE_PERIOD";
        }
        break;
      case "SUBSCRIPTION_CREATED":
        // ignore if already exists
        break;
    }

    sub.lastProcessedTimestamp = event.timestamp;
    assert(sub.lastProcessedTimestamp >= 0);
  }
}
