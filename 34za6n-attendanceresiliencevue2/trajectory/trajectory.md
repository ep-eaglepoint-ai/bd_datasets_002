# Attendance Resilience Vue 2 — Engineering Trajectory
---

## 1. Interpreting the Prompt (What is Actually Being Asked?)

The prompt did **not** ask for a full attendance product. It asked for proof of the following engineering abilities:

* Handling **unstable async data**
* Maintaining **UI responsiveness under failure**
* Designing **predictable state transitions**
* Demonstrating **rollback safety**
* Making the system **testable without a browser**

This reframing mattered because it shifted the goal from *feature completeness* to *resilience under stress*.

**Early hypothesis:**

> “If I can make failure a first-class state instead of an edge case, most requirements collapse into architecture.”

---

## 2. First Fork: How to Represent Async State?

### Naive option (rejected quickly)

```js
loading: false
error: null
data: []
```

**Problem discovered:**
This allows illegal states:

* `loading === true` *and* `error !== null`
* `data` updated while request is “in flight”

This makes testing ambiguous and UI logic defensive.

### Chosen direction: explicit state machine

```js
status: 'idle' | 'loading' | 'success' | 'error'
```

**Why this mattered**

* Forces **single source of truth**
* Makes invalid states unrepresentable
* Allows tests to assert *transitions*, not values

At this point, the store stopped being “Vuex with flags” and became a **finite-state system**.

---

## 3. Second Fork: Optimistic Updates vs UX Safety

The prompt explicitly demanded:

> “Immediately update local state, then reconcile with the server.”

This introduces risk: **state divergence**.

### Options considered

| Approach                  | UX   | Safety | Rejected because |
| ------------------------- | ---- | ------ | ---------------- |
| Pessimistic updates       | Poor | High   | Violates prompt  |
| Full shadow copy of store | OK   | High   | Heavy, complex   |
| Per-entity snapshot       | Good | Good   | ✅ chosen         |

### Insight

Only the **mutated entity** needs rollback support — not the entire store.

This led to the pattern:

```js
previousState → optimistic write → confirm OR rollback
```

Rollback becomes *surgical*, not global.

---

## 4. Data Shape Decision: Array or Map?

Initially tempting:

```js
records: []
```

But optimistic updates + rollbacks + per-entity status tracking revealed a problem:

* Every lookup becomes O(n)
* Tests become order-dependent
* Rollback requires searching

### Chosen normalization

```js
recordsById: {
  [id]: record
}
```

**Reasoning**

* Rollback = single assignment
* Status tracking = keyed by id
* Test assertions = deterministic

This was less about performance and more about **cognitive load** during failure paths.

---

## 5. Error Handling Philosophy Shift

Early idea: automatic retries with backoff.

**Problem**

* Hides failure
* Makes UI appear “stuck”
* Hard to test deterministically

### Pivot: user-controlled retries

Errors become:

* Visible
* Persistent
* Actionable

This aligned better with:

* Enterprise UX expectations
* Deterministic test cases
* Clear state transitions (`error → loading → success`)

---

## 6. Testing Constraint That Shaped Architecture

The evaluation environment **did not guarantee a browser**.

This eliminated:

* Vue Test Utils
* DOM-based assertions

### Consequence

All critical logic had to live in:

* Pure functions
* Store actions
* Deterministic mocks

This constraint *improved* the architecture:

* UI became a projection of state
* State became testable in isolation

---

## 7. Mock API Design: Simulating Pain, Not Sunshine

Instead of mocking success-only APIs, the mock layer intentionally introduced:

* Random latency
* Random failure
* Server-side state mutation

Why?
Because optimistic updates only prove themselves **when they fail**.

The API was designed to be:

* Non-deterministic by default
* Deterministic when configured (for tests)

---

## 8. UI Decisions Were Downstream, Not Primary

Vuetify components were selected **after** state semantics were fixed.

The rule was:

> “UI should never infer state — only reflect it.”

Examples:

* `status === loading` → spinner
* `status === error` → retry affordance
* Per-row loading instead of global lock

This prevented UI logic from becoming a second state machine.

---

## 9. Why Additional Features Appeared Late

Features like:

* clock in/out
* shift conflicts
* hours calculation
* filters

were **not initial goals**.

They emerged because:

* The architecture already supported them
* They stress-tested state transitions
* They revealed whether the system scaled conceptually

Their addition was a **validation step**, not scope creep.