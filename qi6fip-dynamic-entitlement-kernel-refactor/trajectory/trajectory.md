# Refactoring Journey: Entitlement Kernel

This document tracks process of taking a broken, monolithic authorization system and transforming it into a resilient, modular engine.

## Phase 1: The Diagnosis (Finding the Rot)

I started by looking at the original code in `repository_before`. It didn't take long to realize it was a "Permission Ghosting" factory. It violated every core principle of secure software development.

### Critical Problems Identified:
1.  **Fail-Open Security**: If the database timed out, it returned `false` but silenced the error. In production, "Access Denied" due to a bug looks the same as "Access Denied" for valid reasons, making debugging impossible.
2.  **Cache Poisoning**: It checked the cache *before* checking expiries. If a user had a 5-minute permission that expired in 1 minute, the cache would keep granting them access for the remaining 4 minutes.
3.  **Monolithic Tangle**: Logic, database queries, and caching were all mashed into one 72nd-line function. I couldn't test the logic without a real database.

### Core Concepts to Remember:
- **Separation of Concerns**: [What is Separation of Concern?](https://medium.com/@okay.tonka/what-is-separation-of-concern-b6715b2e0f75) - Logic should not care where the data comes from.
- **Fail-Secure vs. Fail-Safe**: [Fail-Safe versus Fail-Secure](https://basila.medium.com/fail-safe-versus-fail-secure-584201a7bada) - In security, we "Fail-Closed." If the system breaks, nobody gets in.

---

## Phase 2: Setting the Bar (The Checklist)

Before writing a single line of the new engine, I created a **Refactoring Checklist** to define what "Success" looks like. I then converted this checklist into a **Unified Test Suite** (`tests/unified_verification.test.js`).

### The Verification Plan (9 Core Requirements):
- [x] **Requirement 1**: Fail-Closed (Systems errors must throw/deny, never return silent false).
- [x] **Requirement 2**: Explainability (Return a reason code, not just a boolean).
- [x] **Requirement 3**: Logic Abstraction (Logic layer must be testable without DB/infra).
- [x] **Requirement 4**: Hierarchical Resolution (ADMIN_DELETE must imply READ).
- [x] **Requirement 5**: Temporal Accuracy (Never allow an expired permission).
- [x] **Requirement 6**: Clean Pipeline (Eliminate nested callbacks and `Promise.some`).
- [x] **Requirement 7**: Race Condition (Secure check order for membership revocation).
- [x] **Requirement 8**: Adversarial Safety (Handle deleted users with stale cache).
- [x] **Requirement 9**: Wildcard Hierarchy (ADMIN_ALL must imply WRITE).

### Step 3: Proving the Failure
I ran these tests against the **original code** (`repository_before`):
- **Result**: `8 FAILURES / 1 SUCCESS`.
- **Observation**: The old code wrongly allowed expired permissions, swallowed DB errors, and lacked any modular separation or hierarchy logic.

---

## Phase 3: The Reconstruction (`repository_after`)

Based on my checklist, I built the new architecture in `repository_after`.

### 1. Data Abstraction Layer (`DataProvider.js`)
I decoupled the rules from the infrastructure. I created a `DataProvider` interface with implementations for:
- `DatabaseDataProvider`: The real deal.
- `CachedDataProvider`: Correctly validates temporal data *before* returning cached hits.
- `InMemoryDataProvider`: For lightning-fast, deterministic tests.

### 2. The Rule Engine (`rules.js` & `EvaluationEngine.js`)
I broke down the monolith into independent, pluggable Rule classes:
- `SuperuserBypassRule`
- `OwnershipRule`
- `GroupPermissionRule` (with Hierarchy)
- `TemporalOverrideRule`

### 3. Permission Hierarchy (`PermissionHierarchy.js`)
Implemented a recursive implication system so that a single "ADMIN" grant correctly flows down to "READ" and "WRITE" without duplicate entries in the database.

---

## Phase 4: Final Validation

With the new engine in place, I ran the **Unified Test Suite** again, this time targeting `repository_after`.

- **Result**: `PASS 100% (9/9)`.
- **Evidence**: The system now correctly handles deep hierarchies, enforces expiries down to the millisecond, and provides a full audit trace for every decision.

---

## Conclusion 

### Architectural Transformation
We replaced a 72-line monolithic function (`EntitlementKernel.js`) with a modular, **Rule-Based Evaluation Engine**. This change moved us from "Script-based Authorization" to "Object-Oriented Authorization."
---

### Requirement Fulfillment (The 9 Pillars)

| #  Requirement  How We Solved It (Technical Detail) 

 **1**  **Fail-Closed**  Eliminated `try/catch` blocks that returned `false`. Logic now throws a custom `AuthorizationError` if the DB fails, forcing the system to deny access safely. 

 **2**  **Explainability**  Created `checkAccessDetailed`. It returns an object containing the boolean result, a specific `reason` code, and a full `trace` of which rules were evaluated. 

 **3**  **Logic Abstraction**  Created the `DataProvider` interface. Business logic now calls `dataProvider.getUser()` instead of writing raw SQL strings inside the evaluation function. 

 **4**  **Hierarchy**  Implemented `PermissionHierarchy.js`. It uses a recursive `implies()` method to determine if a grant (like `ADMIN_DELETE`) satisfies a request (like `READ`). 

 **5**  **Temporal Accuracy**  The `CachedDataProvider` is "smart." It validates the `expiry` timestamp of a permission *before* returning it from the cache. If it's expired, it's ignored. 

 **6**  **Clean Pipeline**  Replaced the nested `Promise.some` callback hell with a clean `for...of` loop in `EvaluationEngine.js`. It's now standard procedural code that is easy to read. 

 **7**  **Race Condition**  Standardized the sequence of checks. We verify User -> Resource -> Permission in a strict order that prevents "access ghosting" if a user is revoked during the check.

 **8**  **Adversarial Safety**  By fetching the User Context at the start of every evaluation (from the provider), we ensure that if a user is deleted from the DB, the rest of the logic fails safely even if the cache is stale. 
 
 **9**  **Wildcard Hierarchy**  The hierarchy system now explicitly maps wildcard-style grants (like `ADMIN_ALL`) to specific granular permissions (`WRITE`, `READ`) in a central configuration. 

---

### Verification & Reliability

1.  **Unit Tests**: Verified rules in isolation using the `InMemoryDataProvider` (0ms execution time).
2.  **Unified Test Suite**: Created a single test file that targets both versions. 
    *   **Old Version**: Fails 8/9 tests (including critical security leaks).
    *   **New Version**: Passes 9/9 tests (Full Compliance).
3.  **Dockerization**: The entire verification runs in isolated containers to ensure it works in production environments.

