// filename: billing_service.ts

/**
 * This module provides the core billing state machine.
 * It is responsible for calculating the next state of a subscription
 * based on incoming billing events.
 */

/**
 * Represents the possible states of a customer subscription.
 * TRIALING: Initial state upon creation.
 * ACTIVE: Successful payment received.
 * PAST_DUE: Payment failure occurred while in ACTIVE/TRIALING.
 * GRACE_PERIOD: Subsequent payment failure while in PAST_DUE.
 * CANCELED: Final state, no further transitions allowed.
 */
export type SubscriptionState = 
  | "TRIALING" 
  | "ACTIVE" 
  | "PAST_DUE" 
  | "GRACE_PERIOD" 
  | "CANCELED";

/**
 * Represents an incoming billing event from the payment gateway.
 * 'timestamp' represents the Unix epoch (ms) when the event occurred at the source.
 */
export interface BillingEvent {
  id: string;
  type: "PAYMENT_SUCCESS" | "PAYMENT_FAILURE" | "SUBSCRIPTION_CREATED" | "SUBSCRIPTION_CANCELLED";
  timestamp: number;
  payload: Record<string, unknown>;
}

/**
 * The internal representation of a Subscription.
 * 'lastProcessedTimestamp' tracks the source timestamp of the last valid event to prevent stale updates.
 */
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

  /**
   * Processes a billing event and updates the subscription state.
   * The implementation assumes that event.timestamp is the authoritative source of truth.
   */
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

    // Guard against stale events arriving late
    if (event.timestamp <= sub.lastProcessedTimestamp) {
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
      case "SUBSCRIPTION_CANCELLED":
        sub.status = "CANCELED";
        break;
    }

    sub.lastProcessedTimestamp = event.timestamp;
  }
}