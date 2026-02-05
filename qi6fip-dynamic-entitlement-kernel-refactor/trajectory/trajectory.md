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

Before I even touched the source code, I sat down and built a hard set of requirements—my "Rules of Engagement." I didn't want to just fix bugs as I found them; I wanted a system that was fundamentally impossible to break in the same ways again. I translated these requirements into a **Unified Test Suite** (`tests/unified_verification.test.js`) that would serve as my compass throughout the refactor.

### The Verification Plan (9 Core Requirements):
- [x] **Requirement 1**: Fail-Closed (Systems errors must throw/deny, never return silent false).
- [x] **Requirement 2**: Explainability (Return a reason code, not just a boolean).
- [x] **Requirement 3**: Logic Abstraction (Logic layer must be testable without DB/infra).
- [x] **Requirement 4**: Hierarchy (ADMIN_DELETE must imply READ).
- [x] **Requirement 5**: Temporal Accuracy (Never allow an expired permission).
- [x] **Requirement 6**: Clean Pipeline (Eliminate nested callbacks and `Promise.some`).
- [x] **Requirement 7**: Race Condition (Secure check order for membership revocation).
- [x] **Requirement 8**: Adversarial Safety (Handle deleted users with stale cache).
- [x] **Requirement 9**: Wildcard Hierarchy (ADMIN_ALL must imply WRITE).

### Step 3: Proving the Failure
Instead of just hoping the new code would be better, I needed a way to objectively prove how "broken" the current system was. I designed a test suite that was focusing on the edge cases where security systems usually fail, like database timeouts and stale cache entries.

I wrote the tests to be "unified," meaning the exact same test cases run against both the old and new implementations. When I ran them against the legacy code in `repository_before`, the results were a wake-up call: **8 out of 11 compliance tests failed.**

When I mocked a simple database timeout. The old code didn't just fail; it failed *silently*. It swallowed the error and returned `false`, which is a debugging nightmare. I also managed to "poison" the cache by injecting a stale permission that should have expired minutes ago—the old system happily accepted it as valid. This wasn't just messy code; it was a series of latent security vulnerabilities waiting to happen.

### Deep Dive: The Test Logic
I didn't just write generic tests; I wrote specific "Compliance Checks" designed to break a lazy implementation. Here is the logic behind every single test in the `unified_verification.test.js`

#### 1. The Foundation (Preservation)
- **`Owner should always have access`**: If you created the resource, you should be able to see it. This checks if the system can correctly identify the relationship between a `subjectId` and an `owner_id`.
- **`Superuser should always have access`**: It verifies that a `is_superuser: 1` flag bypasses all other rules.

#### 2. The Security Pillars (STRICT Requirements)
- **`Fail-Closed (Database Failure)`**: This mocks a `DATABASE_TIMEOUT` error. I required the system to **throw** an error here. If it just returns `false`, a developer might accidentally write `if (!allowed) { sendEmail() }`, and a database hiccup could trigger thousands of emails.
- **`Explainability (Reason Codes)`**: I tested for more than just a boolean. The suite checks that the engine returns `BYPASS_SUPERUSER` or `OWNER` reasons so we can audit *why* someone got in.
- **`Logic Abstraction (The Engine Test)`**: This test actually tries to import the `EvaluationEngine` and `DataProvider` without the infrastructure. If they are still tangled with DB connection logic, this test fails.
- **`Hierarchy (Permission Flow)`**: This checks if a user with `ADMIN_DELETE` can perform a `READ`. It tests the complex logic of permission nesting.
- **`Temporal Correctness (The Cache Poisoning Check)`**: I deliberately put an expired permission into the cache. If the engine blindly trusts the cache without checking the `expiry` timestamp, it's a security fail.
- **`Code Quality (The Pipeline Check)`**: This is a static analysis check (for the `after` version) to ensure we've moved away from nested `.some()` and callback hell into a clean, iterable rule pipeline.
- **`Race Condition (Secure Order)`**: I simulate a user whose access is being revoked at the exact moment of the check. It's interesting that this test passes in **both** versions. Even the legacy code happens to be "safe" here because it checks for group permissions *before* checking if the user is still a member of that group. By the time it hits the membership check, the revocation is caught. In the refactored version, this is even more robust because each rule in the pipeline re-validates the current state through the `DataProvider`.
- **`Adversarial Safety (Deleted Users)`**: I mock a situation where a user still exists in the cache but has been deleted from the master database. The test forces a fresh user-state fetch to prevent "zombie" users from maintaining access.
- **`Wildcard Override (ADMIN_ALL)`**: Finally, I verify that high-level wildcards correctly map down to granular actions like `WRITE`.

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

## Phase 4: Final Validation

Once the new engine was ready, the moment of truth was running that same unified test suite against `repository_after`. 

It's one thing to see code looking clean on the screen, but seeing those green checkmarks pop up in the terminal is what matters. Since I had dockerized the environment, I could spin up a clean instance and verify that everything—from the database mocks to the hierarchy logic—was firing exactly as planned. 

- **Result**: `PASS 100% (11/11)`.
- **Evidence**: The system now correctly handles deep hierarchies, enforces expiries down to the millisecond, and provides a full audit trace for every decision. No more silent failures; if something goes wrong now, we'll actually know about it.

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
    *   **Old Version**: Fails 8/11 tests (including critical security leaks).
    *   **New Version**: Passes 11/11 tests (Full Compliance).
3.  **Dockerization**: The entire verification runs in isolated containers to ensure it works in production environments.

