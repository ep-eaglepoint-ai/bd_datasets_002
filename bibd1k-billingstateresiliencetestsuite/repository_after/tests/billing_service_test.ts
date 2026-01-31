/**
 * Comprehensive Test Suite for Billing State Machine Resilience
 *
 * This test suite verifies:
 * 1. All valid FSM transition paths
 * 2. Late arrival event handling
 * 3. Idempotency for all event types
 * 4. Shuffle stress test (property-based)
 * 5. Terminal state immutability
 * 6. Future dating behavior
 * 7. Cancellation from all non-terminal states
 * 8. PAYMENT_SUCCESS from all applicable states
 */

import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { BillingService, BillingEvent, SubscriptionState } from "../billing_service.ts";

// Helper to create events
function event(id: string, type: BillingEvent["type"], ts: number): BillingEvent {
  return { id, type, timestamp: ts, payload: {} };
}

// Helper to create a subscription in a specific state
function createSubscriptionInState(svc: BillingService, subId: string, targetState: SubscriptionState): number {
  let ts = 100;
  svc.processEvent(subId, event("create", "SUBSCRIPTION_CREATED", ts));
  ts += 100;

  switch (targetState) {
    case "TRIALING":
      // Already in TRIALING after creation
      break;
    case "ACTIVE":
      svc.processEvent(subId, event("pay1", "PAYMENT_SUCCESS", ts));
      ts += 100;
      break;
    case "PAST_DUE":
      svc.processEvent(subId, event("pay1", "PAYMENT_SUCCESS", ts));
      ts += 100;
      svc.processEvent(subId, event("fail1", "PAYMENT_FAILURE", ts));
      ts += 100;
      break;
    case "GRACE_PERIOD":
      svc.processEvent(subId, event("pay1", "PAYMENT_SUCCESS", ts));
      ts += 100;
      svc.processEvent(subId, event("fail1", "PAYMENT_FAILURE", ts));
      ts += 100;
      svc.processEvent(subId, event("fail2", "PAYMENT_FAILURE", ts));
      ts += 100;
      break;
    case "CANCELED":
      svc.processEvent(subId, event("cancel", "SUBSCRIPTION_CANCELLED", ts));
      ts += 100;
      break;
  }
  return ts;
}

// ============================================================================
// SECTION 1: Valid Transition Paths (FSM)
// ============================================================================

Deno.test("FSM: TRIALING -> ACTIVE via PAYMENT_SUCCESS", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  assertEquals(svc.getSubscription("sub-1")?.status, "TRIALING");

  svc.processEvent("sub-1", event("e2", "PAYMENT_SUCCESS", 200));
  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");
});

Deno.test("FSM: TRIALING -> PAST_DUE via PAYMENT_FAILURE", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "PAYMENT_FAILURE", 200));
  assertEquals(svc.getSubscription("sub-1")?.status, "PAST_DUE");
});

Deno.test("FSM: ACTIVE -> PAST_DUE via PAYMENT_FAILURE", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "PAYMENT_SUCCESS", 200));
  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");

  svc.processEvent("sub-1", event("e3", "PAYMENT_FAILURE", 300));
  assertEquals(svc.getSubscription("sub-1")?.status, "PAST_DUE");
});

Deno.test("FSM: PAST_DUE -> GRACE_PERIOD via PAYMENT_FAILURE", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "PAYMENT_SUCCESS", 200));
  svc.processEvent("sub-1", event("e3", "PAYMENT_FAILURE", 300));
  assertEquals(svc.getSubscription("sub-1")?.status, "PAST_DUE");

  svc.processEvent("sub-1", event("e4", "PAYMENT_FAILURE", 400));
  assertEquals(svc.getSubscription("sub-1")?.status, "GRACE_PERIOD");
});

Deno.test("FSM: PAST_DUE -> ACTIVE via PAYMENT_SUCCESS", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "PAYMENT_SUCCESS", 200));
  svc.processEvent("sub-1", event("e3", "PAYMENT_FAILURE", 300));
  assertEquals(svc.getSubscription("sub-1")?.status, "PAST_DUE");

  svc.processEvent("sub-1", event("e4", "PAYMENT_SUCCESS", 400));
  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");
});

Deno.test("FSM: GRACE_PERIOD -> ACTIVE via PAYMENT_SUCCESS", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "PAYMENT_SUCCESS", 200));
  svc.processEvent("sub-1", event("e3", "PAYMENT_FAILURE", 300));
  svc.processEvent("sub-1", event("e4", "PAYMENT_FAILURE", 400));
  assertEquals(svc.getSubscription("sub-1")?.status, "GRACE_PERIOD");

  svc.processEvent("sub-1", event("e5", "PAYMENT_SUCCESS", 500));
  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");
});

// ============================================================================
// SECTION 2: Cancellation from Each Non-Terminal State
// ============================================================================

Deno.test("FSM: TRIALING -> CANCELED via SUBSCRIPTION_CANCELLED", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  assertEquals(svc.getSubscription("sub-1")?.status, "TRIALING");

  svc.processEvent("sub-1", event("e2", "SUBSCRIPTION_CANCELLED", 200));
  assertEquals(svc.getSubscription("sub-1")?.status, "CANCELED");
});

Deno.test("FSM: ACTIVE -> CANCELED via SUBSCRIPTION_CANCELLED", () => {
  const svc = new BillingService();
  const ts = createSubscriptionInState(svc, "sub-1", "ACTIVE");
  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");

  svc.processEvent("sub-1", event("cancel", "SUBSCRIPTION_CANCELLED", ts));
  assertEquals(svc.getSubscription("sub-1")?.status, "CANCELED");
});

Deno.test("FSM: PAST_DUE -> CANCELED via SUBSCRIPTION_CANCELLED", () => {
  const svc = new BillingService();
  const ts = createSubscriptionInState(svc, "sub-1", "PAST_DUE");
  assertEquals(svc.getSubscription("sub-1")?.status, "PAST_DUE");

  svc.processEvent("sub-1", event("cancel", "SUBSCRIPTION_CANCELLED", ts));
  assertEquals(svc.getSubscription("sub-1")?.status, "CANCELED");
});

Deno.test("FSM: GRACE_PERIOD -> CANCELED via SUBSCRIPTION_CANCELLED", () => {
  const svc = new BillingService();
  const ts = createSubscriptionInState(svc, "sub-1", "GRACE_PERIOD");
  assertEquals(svc.getSubscription("sub-1")?.status, "GRACE_PERIOD");

  svc.processEvent("sub-1", event("cancel", "SUBSCRIPTION_CANCELLED", ts));
  assertEquals(svc.getSubscription("sub-1")?.status, "CANCELED");
});

// ============================================================================
// SECTION 3: Late Arrival Events
// ============================================================================

Deno.test("Late arrival: older event does not overwrite newer state", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "PAYMENT_SUCCESS", 300));
  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");

  // Late arriving event with older timestamp
  svc.processEvent("sub-1", event("late", "PAYMENT_FAILURE", 200));
  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");
  assertEquals(svc.getSubscription("sub-1")?.lastProcessedTimestamp, 300);
});

Deno.test("Late arrival: multiple late events are all ignored", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "PAYMENT_SUCCESS", 500));

  // Multiple late events
  svc.processEvent("sub-1", event("late1", "PAYMENT_FAILURE", 200));
  svc.processEvent("sub-1", event("late2", "PAYMENT_FAILURE", 300));
  svc.processEvent("sub-1", event("late3", "PAYMENT_FAILURE", 400));

  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");
  assertEquals(svc.getSubscription("sub-1")?.lastProcessedTimestamp, 500);
});

Deno.test("Late arrival: exact same timestamp is ignored", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "PAYMENT_SUCCESS", 200));

  // Same timestamp event should be ignored
  svc.processEvent("sub-1", event("same-ts", "PAYMENT_FAILURE", 200));
  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");
});

// ============================================================================
// SECTION 4: Idempotency Tests for All Event Types
// ============================================================================

Deno.test("Idempotency: SUBSCRIPTION_CREATED duplicate has no effect", () => {
  const svc = new BillingService();
  const ev = event("e1", "SUBSCRIPTION_CREATED", 100);

  svc.processEvent("sub-1", ev);
  svc.processEvent("sub-1", ev);
  svc.processEvent("sub-1", ev);

  assertEquals(svc.getSubscription("sub-1")?.status, "TRIALING");
  assertEquals(svc.getSubscription("sub-1")?.lastProcessedTimestamp, 100);
});

Deno.test("Idempotency: PAYMENT_SUCCESS duplicate has no effect", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));

  const payEvent = event("e2", "PAYMENT_SUCCESS", 200);
  svc.processEvent("sub-1", payEvent);
  const stateAfterFirst = svc.getSubscription("sub-1")?.status;
  const tsAfterFirst = svc.getSubscription("sub-1")?.lastProcessedTimestamp;

  svc.processEvent("sub-1", payEvent);
  svc.processEvent("sub-1", payEvent);

  assertEquals(svc.getSubscription("sub-1")?.status, stateAfterFirst);
  assertEquals(svc.getSubscription("sub-1")?.lastProcessedTimestamp, tsAfterFirst);
});

Deno.test("Idempotency: PAYMENT_FAILURE duplicate has no effect", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "PAYMENT_SUCCESS", 200));

  const failEvent = event("e3", "PAYMENT_FAILURE", 300);
  svc.processEvent("sub-1", failEvent);
  const stateAfterFirst = svc.getSubscription("sub-1")?.status;
  const tsAfterFirst = svc.getSubscription("sub-1")?.lastProcessedTimestamp;

  svc.processEvent("sub-1", failEvent);
  svc.processEvent("sub-1", failEvent);

  assertEquals(svc.getSubscription("sub-1")?.status, stateAfterFirst);
  assertEquals(svc.getSubscription("sub-1")?.lastProcessedTimestamp, tsAfterFirst);
});

Deno.test("Idempotency: SUBSCRIPTION_CANCELLED duplicate has no effect", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));

  const cancelEvent = event("e2", "SUBSCRIPTION_CANCELLED", 200);
  svc.processEvent("sub-1", cancelEvent);

  svc.processEvent("sub-1", cancelEvent);
  svc.processEvent("sub-1", cancelEvent);

  assertEquals(svc.getSubscription("sub-1")?.status, "CANCELED");
});

// ============================================================================
// SECTION 5: Shuffle Stress Test (Property-Based)
// ============================================================================

Deno.test("Shuffle stress test: 100 permutations converge to same final state", () => {
  const id = "sub-stress";

  const seq: BillingEvent[] = [
    event("e1", "PAYMENT_SUCCESS", 200),
    event("e2", "PAYMENT_FAILURE", 300),
    event("e3", "PAYMENT_FAILURE", 400),
    event("e4", "PAYMENT_SUCCESS", 500),
    event("e5", "PAYMENT_FAILURE", 600),
    event("e6", "SUBSCRIPTION_CANCELLED", 700),
    event("e7", "PAYMENT_SUCCESS", 800),
    event("e8", "PAYMENT_FAILURE", 900),
    event("e9", "PAYMENT_SUCCESS", 1000),
    event("e10", "PAYMENT_FAILURE", 1100),
  ];

  const finalStates: string[] = [];

  for (let i = 0; i < 100; i++) {
    const shuffled = seq.slice();
    // Fisher-Yates shuffle
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
    }

    const svc = new BillingService();
    svc.processEvent(id, event("e0", "SUBSCRIPTION_CREATED", 100));

    for (const ev of shuffled) {
      svc.processEvent(id, ev);
    }

    finalStates.push(svc.getSubscription(id)?.status ?? "");
  }

  // All permutations should converge to CANCELED
  assert(finalStates.every((s) => s === "CANCELED"));
});

Deno.test("Property-based: state depends only on timestamps, not arrival order", () => {
  // Create a deterministic sequence and verify order doesn't matter
  const events: BillingEvent[] = [
    event("e1", "PAYMENT_SUCCESS", 200),
    event("e2", "PAYMENT_FAILURE", 300),
    event("e3", "PAYMENT_SUCCESS", 400),
  ];

  // Test multiple random orderings
  for (let i = 0; i < 20; i++) {
    const shuffled = events.slice().sort(() => Math.random() - 0.5);
    const svc = new BillingService();
    svc.processEvent("sub", event("create", "SUBSCRIPTION_CREATED", 100));

    for (const ev of shuffled) {
      svc.processEvent("sub", ev);
    }

    // Final state should always be ACTIVE (timestamp 400 is latest, PAYMENT_SUCCESS)
    assertEquals(svc.getSubscription("sub")?.status, "ACTIVE");
  }
});

Deno.test("Property-based: timestamp ordering determines final state", () => {
  const svc1 = new BillingService();
  const svc2 = new BillingService();

  // Same events, different arrival order
  svc1.processEvent("sub", event("create", "SUBSCRIPTION_CREATED", 100));
  svc1.processEvent("sub", event("pay", "PAYMENT_SUCCESS", 200));
  svc1.processEvent("sub", event("fail", "PAYMENT_FAILURE", 300));

  svc2.processEvent("sub", event("create", "SUBSCRIPTION_CREATED", 100));
  svc2.processEvent("sub", event("fail", "PAYMENT_FAILURE", 300));
  svc2.processEvent("sub", event("pay", "PAYMENT_SUCCESS", 200)); // Arrives late

  // Both should end up in PAST_DUE because PAYMENT_FAILURE at 300 is latest
  assertEquals(svc1.getSubscription("sub")?.status, "PAST_DUE");
  assertEquals(svc2.getSubscription("sub")?.status, "PAST_DUE");
});

// ============================================================================
// SECTION 6: Terminal State Immutability
// ============================================================================

Deno.test("Terminal state: CANCELED cannot transition to ACTIVE via PAYMENT_SUCCESS", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "SUBSCRIPTION_CANCELLED", 200));
  assertEquals(svc.getSubscription("sub-1")?.status, "CANCELED");

  svc.processEvent("sub-1", event("e3", "PAYMENT_SUCCESS", 300));
  assertEquals(svc.getSubscription("sub-1")?.status, "CANCELED");
});

Deno.test("Terminal state: CANCELED cannot transition to PAST_DUE via PAYMENT_FAILURE", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "SUBSCRIPTION_CANCELLED", 200));

  svc.processEvent("sub-1", event("e3", "PAYMENT_FAILURE", 300));
  assertEquals(svc.getSubscription("sub-1")?.status, "CANCELED");
});

Deno.test("Terminal state: multiple events after CANCELED have no effect", () => {
  const svc = new BillingService();
  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "SUBSCRIPTION_CANCELLED", 200));

  svc.processEvent("sub-1", event("e3", "PAYMENT_SUCCESS", 300));
  svc.processEvent("sub-1", event("e4", "PAYMENT_FAILURE", 400));
  svc.processEvent("sub-1", event("e5", "PAYMENT_SUCCESS", 500));
  svc.processEvent("sub-1", event("e6", "PAYMENT_FAILURE", 600));

  assertEquals(svc.getSubscription("sub-1")?.status, "CANCELED");
});

// ============================================================================
// SECTION 7: Future Dating
// ============================================================================

Deno.test("Future dating: events with future timestamps are accepted", () => {
  const svc = new BillingService();
  const futureTime = Date.now() + 1000 * 60 * 60 * 24; // 24 hours in future

  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "PAYMENT_SUCCESS", futureTime));

  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");
  assertEquals(svc.getSubscription("sub-1")?.lastProcessedTimestamp, futureTime);
});

Deno.test("Future dating: future event blocks older events", () => {
  const svc = new BillingService();
  const futureTime = Date.now() + 1000 * 60 * 60 * 24;

  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent("sub-1", event("e2", "PAYMENT_SUCCESS", futureTime));

  // Current time events should be ignored
  svc.processEvent("sub-1", event("e3", "PAYMENT_FAILURE", Date.now()));

  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");
});

// ============================================================================
// SECTION 8: Edge Cases
// ============================================================================

Deno.test("Edge case: subscription not found throws error", () => {
  const svc = new BillingService();

  let threw = false;
  try {
    svc.processEvent("nonexistent", event("e1", "PAYMENT_SUCCESS", 100));
  } catch (e) {
    threw = true;
    assert(e instanceof Error);
    assertEquals(e.message, "Subscription not found");
  }
  assert(threw, "Expected error to be thrown");
});

Deno.test("Edge case: GRACE_PERIOD stays in GRACE_PERIOD on additional PAYMENT_FAILURE", () => {
  const svc = new BillingService();
  const ts = createSubscriptionInState(svc, "sub-1", "GRACE_PERIOD");
  assertEquals(svc.getSubscription("sub-1")?.status, "GRACE_PERIOD");

  // Additional failures should not change state (already at GRACE_PERIOD)
  svc.processEvent("sub-1", event("fail3", "PAYMENT_FAILURE", ts));
  svc.processEvent("sub-1", event("fail4", "PAYMENT_FAILURE", ts + 100));

  assertEquals(svc.getSubscription("sub-1")?.status, "GRACE_PERIOD");
});

Deno.test("Edge case: complete lifecycle from TRIALING to CANCELED", () => {
  const svc = new BillingService();

  svc.processEvent("sub-1", event("e1", "SUBSCRIPTION_CREATED", 100));
  assertEquals(svc.getSubscription("sub-1")?.status, "TRIALING");

  svc.processEvent("sub-1", event("e2", "PAYMENT_SUCCESS", 200));
  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");

  svc.processEvent("sub-1", event("e3", "PAYMENT_FAILURE", 300));
  assertEquals(svc.getSubscription("sub-1")?.status, "PAST_DUE");

  svc.processEvent("sub-1", event("e4", "PAYMENT_SUCCESS", 400));
  assertEquals(svc.getSubscription("sub-1")?.status, "ACTIVE");

  svc.processEvent("sub-1", event("e5", "PAYMENT_FAILURE", 500));
  assertEquals(svc.getSubscription("sub-1")?.status, "PAST_DUE");

  svc.processEvent("sub-1", event("e6", "PAYMENT_FAILURE", 600));
  assertEquals(svc.getSubscription("sub-1")?.status, "GRACE_PERIOD");

  svc.processEvent("sub-1", event("e7", "SUBSCRIPTION_CANCELLED", 700));
  assertEquals(svc.getSubscription("sub-1")?.status, "CANCELED");
});
