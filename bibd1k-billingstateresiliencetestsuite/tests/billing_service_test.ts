import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";

const repo = Deno.env.get("REPO") ?? "repository_after";
const modulePath = `../${repo}/billing_service.ts`;
const mod = await import(modulePath);
const { BillingService } = mod;

type BillingEvent = {
  id: string;
  type: "PAYMENT_SUCCESS" | "PAYMENT_FAILURE" | "SUBSCRIPTION_CREATED" | "SUBSCRIPTION_CANCELLED";
  timestamp: number;
  payload: Record<string, unknown>;
};

function event(id: string, type: BillingEvent["type"], ts: number): BillingEvent {
  return { id, type, timestamp: ts, payload: {} };
}

Deno.test("valid transition paths", () => {
  const svc = new BillingService();
  const id = "sub-1";
  svc.processEvent(id, event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent(id, event("e2", "PAYMENT_SUCCESS", 200));
  assertEquals(svc.getSubscription(id)?.status, "ACTIVE");
  svc.processEvent(id, event("e3", "PAYMENT_FAILURE", 300));
  assertEquals(svc.getSubscription(id)?.status, "PAST_DUE");
  svc.processEvent(id, event("e4", "PAYMENT_FAILURE", 400));
  assertEquals(svc.getSubscription(id)?.status, "GRACE_PERIOD");
});

Deno.test("late arrival events do not overwrite newer state", () => {
  const svc = new BillingService();
  const id = "sub-2";
  svc.processEvent(id, event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent(id, event("e2", "PAYMENT_SUCCESS", 200));
  svc.processEvent(id, event("late", "PAYMENT_FAILURE", 150));
  assertEquals(svc.getSubscription(id)?.status, "ACTIVE");
});

Deno.test("idempotency for duplicate events", () => {
  const svc = new BillingService();
  const id = "sub-3";
  const ev = event("e1", "SUBSCRIPTION_CREATED", 100);
  svc.processEvent(id, ev);
  svc.processEvent(id, ev);
  assertEquals(svc.getSubscription(id)?.status, "TRIALING");
});

Deno.test("shuffle stress test converges to same final state", () => {
  const id = "sub-4";

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
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
    }
    const s = new BillingService();
    s.processEvent(id, event("e0", "SUBSCRIPTION_CREATED", 100));
    for (const ev of shuffled) {
      s.processEvent(id, ev);
    }
    finalStates.push(s.getSubscription(id)?.status ?? "");
  }
  assert(finalStates.every((s) => s === "CANCELED"));
});

Deno.test("terminal state canceled is immutable", () => {
  const svc = new BillingService();
  const id = "sub-5";
  svc.processEvent(id, event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent(id, event("e2", "SUBSCRIPTION_CANCELLED", 200));
  svc.processEvent(id, event("e3", "PAYMENT_SUCCESS", 300));
  svc.processEvent(id, event("e4", "PAYMENT_FAILURE", 400));
  assertEquals(svc.getSubscription(id)?.status, "CANCELED");
});

Deno.test("future dating events are accepted and update timestamp", () => {
  const svc = new BillingService();
  const id = "sub-6";
  const future = Date.now() + 1000 * 60 * 60;
  svc.processEvent(id, event("e1", "SUBSCRIPTION_CREATED", 100));
  svc.processEvent(id, event("e2", "PAYMENT_SUCCESS", future));
  const sub = svc.getSubscription(id);
  assertEquals(sub?.status, "ACTIVE");
  assert(sub?.lastProcessedTimestamp === future);
});

Deno.test("invalid sequences never create stuck states", () => {
  const svc = new BillingService();
  const id = "sub-7";
  svc.processEvent(id, event("e1", "SUBSCRIPTION_CREATED", 100));
  const events = [
    event("e2", "PAYMENT_FAILURE", 200),
    event("e3", "PAYMENT_FAILURE", 300),
    event("e4", "PAYMENT_SUCCESS", 400),
    event("e5", "PAYMENT_FAILURE", 500),
    event("e6", "SUBSCRIPTION_CANCELLED", 600),
  ];
  for (const ev of events) svc.processEvent(id, ev);
  const status = svc.getSubscription(id)?.status;
  assert(["TRIALING", "ACTIVE", "PAST_DUE", "GRACE_PERIOD", "CANCELED"].includes(status ?? ""));
});
