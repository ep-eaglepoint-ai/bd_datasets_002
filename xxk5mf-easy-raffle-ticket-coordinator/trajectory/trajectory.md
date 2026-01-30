# Trajectory: High-Integrity Digital Raffle

## 1. AUDIT / REQUIREMENTS ANALYSIS
**Guiding Question**: *What exactly needs to be built, and what are the constraints?*

The objective is a **CREATION** task: a raffle with a hard cap of 100 tickets and strict fairness. Hundreds of users may hit purchase at the same time—the system must never oversell and must enforce a max of 2 tickets per user.

### Core Requirements
* **Atomic inventory**: POST /purchase must never allow total tickets to exceed 100, even under concurrent requests.
* **Per-user fairness**: Track by UserID; reject any attempt beyond 2 tickets per person, enforced only on the server.
* **Secure admin draw**: Protected POST /admin/draw-winner using Node `crypto.randomInt`; persist the winning ticket.
* **Data visibility**: Raffle state OPEN vs CLOSED; winning ticket must not be exposed until the raffle is closed.

### Constraint Analysis
* **Backend as source of truth**: All business rules live in Express; the React UI is presentation and UX only.
* **PostgreSQL for atomicity**: Use transactions and row locking (e.g. SELECT ... FOR UPDATE) so concurrent purchases serialize correctly.
* **Docker**: PostgreSQL and app run via docker-compose; tests and evaluation run inside the app container.

---

## 2. QUESTION ASSUMPTIONS
**Guiding Question**: *Why are we doing this? Is this the right approach?*

* **Assumption**: "In-memory or SQLite is enough."
    * **Reality**: The spec calls for handling requests "at the same millisecond." We need a DB that supports real transactions and row locking; PostgreSQL in Docker matches the reference setup and gives us that.
* **Assumption**: "We can enforce the 2-ticket limit on the client."
    * **Reality**: The spec says the frontend must not be trusted for validation. The backend must reject over-purchases regardless of client behaviour (multiple tabs, modified requests).
* **Lesson**: Keep validation and inventory logic entirely in the server; the client only displays state and errors.

---

## 3. DEFINE SUCCESS CRITERIA
**Guiding Question**: *What does "done" mean in concrete, measurable terms?*

**[Atomicity: No oversell]**:
- **Acceptance**: Total tickets in the DB never exceed 100, even with 150 concurrent purchase attempts (50 users × 3 each).
- **Verification**: Integration test in `tests/concurrency.test.ts`; assert exactly 100 tickets and 50 rejected outcomes.

**[Fairness: Per-user cap]**:
- **Acceptance**: No user has more than 2 tickets; third purchase returns "Limit Reached."
- **Verification**: Unit/integration tests in `tests/purchase.test.ts` and concurrency test.

**[Winner draw]**:
- **Acceptance**: One winner chosen with `crypto.randomInt`; result persisted; not exposed when status is OPEN.
- **Verification**: `tests/winner-draw.test.ts` (distribution over 1,000 draws); `tests/admin-draw.test.ts` (auth + visibility).

**[UX]**:
- **Acceptance**: Dashboard shows remaining count; purchase button has loading/disabled states and error recovery.
- **Verification**: UI tests in `tests/ui/dashboard.test.tsx`, `tests/ui/purchase-button.test.tsx`, `tests/ui/error-recovery.test.tsx`.

---

## 4. MAP REQUIREMENTS TO VALIDATION
**Guiding Question**: *How will we prove the solution is correct and complete?*

| Requirement | Test Strategy | File(s) |
| :--- | :--- | :--- |
| No oversell | 50 users × 3 requests; exactly 100 tickets, 50 rejections | `tests/concurrency.test.ts` |
| Per-user limit | Reject 3rd purchase for same user | `tests/purchase.test.ts` |
| Winner fairness | 10 tickets, 1,000 draws; valid IDs only, reasonable distribution | `tests/winner-draw.test.ts` |
| Admin draw + visibility | 401 without auth; winner only when CLOSED | `tests/admin-draw.test.ts`, `tests/raffle-state.test.ts` |
| UI states & errors | Mock fetch; assert disabled/loading/error message | `tests/ui/*.test.tsx` |

**Mental checkpoint**: "If two requests for the same user land in the same millisecond, does the DB transaction + row lock serialize them so we never insert a 3rd ticket? Yes—we lock `raffle_meta` with FOR UPDATE and check user count inside the same transaction."

---

## 5. SCOPE THE SOLUTION
**Guiding Question**: *What is the minimal implementation that meets all requirements?*

### Component inventory (all paths exist in the repo)
* **`repository_after/server/db.ts`**: PostgreSQL pool from `DATABASE_URL`; `getPool()`, `initSchema()`, `closePool()` so tests can tear down.
* **`repository_after/server/schema.sql`**: Tables `raffle_meta` (status, winning_ticket_id) and `tickets` (id, user_id); single raffle row id=1.
* **`repository_after/server/raffleService.ts`**: `purchaseTickets()` (transaction + FOR UPDATE), `getRaffleState()` (no winner when OPEN), `drawWinner()` (crypto.randomInt), `selectWinningTicketId()` for unit tests.
* **`repository_after/server/adminAuth.ts`**: Middleware for Bearer / X-Admin-Key; 401 if missing or wrong.
* **`repository_after/server/routes.ts`**: POST /purchase, GET /raffle/state, POST /admin/draw-winner.
* **`repository_after/server/index.ts`**: Express app; mounts `/api` routes; optional static serve of `repository_after/client` build.
* **`repository_after/client/src/App.tsx`**: Dashboard (remaining, user count, status); purchase button with loading/disabled and error message.
* **`tests/jest.config.js`**, **`tests/jest.setup.js`**: Jest lives under `tests/`; `rootDir` and absolute setup path so config works from repo root and in Docker.
* **`evaluation/evaluation.ts`**: Runs Jest then writes report to `evaluation/<date>/<time>/report.json`.

---

## 6. TRACE DATA/CONTROL FLOW
**Guiding Question**: *How will data/control flow through the new system?*

**Purchase flow**:
1. Client POSTs `/api/purchase` with `{ userId, quantity }`.
2. Route calls `purchaseTickets(userId, quantity)`.
3. Service acquires client, `BEGIN`, then `SELECT ... FROM raffle_meta WHERE id=1 FOR UPDATE` (lock).
4. Check status = OPEN, total tickets < 100, user tickets < 2; then INSERT ticket(s); `COMMIT`.
5. Response: `{ success, tickets, remaining }` or `{ success: false, error: 'Sold Out' | 'Limit Reached' | 'Raffle Closed' }`.
6. Client refetches GET `/api/raffle/state?userId=...` and updates UI; on failure shows error and re-enables button.

**Draw flow**:
1. Admin POSTs `/api/admin/draw-winner` with Bearer token.
2. `adminAuth` validates; service loads ticket IDs, picks index with `crypto.randomInt(0, length)`, updates `raffle_meta` to CLOSED and sets `winning_ticket_id`.
3. Thereafter GET `/api/raffle/state` may include `winningTicketId` so the client can show the winner.

---

## 7. ANTICIPATE OBJECTIONS
**Guiding Question**: *What could go wrong? What objections might arise?*

**Objection 1**: "Why not use a single in-process lock instead of DB transactions?"
- **Counter**: Multiple processes or replicas would not share that lock. PostgreSQL transactions and row locking give correct behaviour under any number of app instances.

**Objection 2**: "Jest doesn’t exit after tests."
- **Counter**: The pg pool keeps the event loop alive. We added `afterAll(() => closePool())` in every test file that uses the DB (`purchase.test.ts`, `raffle-state.test.ts`, `admin-draw.test.ts`, `concurrency.test.ts`) so Jest can exit cleanly.

**Objection 3**: "Jest config in `tests/` breaks when run from Docker (rootDir becomes tests/)."
- **Counter**: We set `rootDir: path.resolve(__dirname, '..')` and use an absolute path for `jest.setup.js` (`path.resolve(__dirname, 'jest.setup.js')`) so the setup file is always found and paths like `<rootDir>/repository_after/...` resolve to the repo root.

---

## 8. VERIFY INVARIANTS / DEFINE CONSTRAINTS
**Guiding Question**: *What must remain true throughout the implementation?*

**Must satisfy**:
- Total rows in `tickets` ≤ 100. ✓ (enforced in transaction in `raffleService.ts`)
- Per user_id, count ≤ 2. ✓ (checked in same transaction)
- Winning ticket is never returned by a public API while status = OPEN. ✓ (`getRaffleState` only adds `winningTicketId` when CLOSED)
- Admin draw uses `crypto.randomInt`. ✓ (`raffleService.ts`)

**Must not violate**:
- No business rule enforced only on the client. ✓ (all checks in Express)
- No hard-coded secrets in repo; use `ADMIN_SECRET` and `DATABASE_URL` from env. ✓

---

## 9. EXECUTE WITH SURGICAL PRECISION
**Guiding Question**: *In what order should changes be made to minimize risk?*

1. **Root setup**: `package.json` (Express, pg, React, Jest, etc.), `tsconfig.json`, `docker-compose.yml`, `Dockerfile`, `.gitignore`, `.dockerignore`. Keep `package.json` at root; move Jest config under `tests/`.
2. **DB layer**: `repository_after/server/schema.sql`, `repository_after/server/db.ts` (pool, initSchema, closePool).
3. **Business logic**: `repository_after/server/raffleService.ts` (purchase with transaction + FOR UPDATE, getRaffleState, drawWinner, selectWinningTicketId).
4. **API**: `repository_after/server/adminAuth.ts`, `repository_after/server/routes.ts`, `repository_after/server/index.ts`.
5. **Frontend**: `repository_after/client/` (Vite, React, `App.tsx` with dashboard and purchase UX).
6. **Tests**: `tests/testDbHelper.ts`, `tests/jest.config.js`, `tests/jest.setup.js`; then purchase, raffle-state, admin-draw, concurrency, winner-draw, and `tests/ui/*.test.tsx`. Add `afterAll(closePool)` in every DB-using test file.
7. **Evaluation**: `evaluation/evaluation.ts` (Jest with `tests/jest.config.js`, then write report). README: title plus two Docker commands (`docker compose run --rm app npm run test`, `docker compose run --rm app npm run evaluate`).

---

## 10. MEASURE IMPACT / VERIFY COMPLETION
**Guiding Question**: *Did we build what was required? Can we prove it?*

**Requirements completion**:
- **Atomic inventory**: Concurrency test passes; 100 tickets, 50 rejections. No oversell.
- **Per-user fairness**: Purchase tests reject 3rd ticket; concurrency test asserts no user has > 2.
- **Admin draw**: Admin tests check 401 without auth, 200 with auth, and winner only exposed when CLOSED. Winner-draw test checks distribution and valid IDs only.
- **UI**: Dashboard, purchase-button, and error-recovery UI tests pass with mocked fetch.

**Quality / ops**:
- Jest exits after run (closePool in afterAll).
- Config under `tests/` works from root and in Docker (explicit rootDir and absolute setup path).
- Report generated under `evaluation/<date>/<time>/report.json` by `evaluation/evaluation.ts`.

---

## 11. DOCUMENT THE DECISION
**Guiding Question**: *Why did we do this, and when should it be revisited?*

* **Problem**: Raffle with a strict cap of 100 tickets and 2 per user, under heavy concurrency, with a secure admin draw and no early exposure of the winner.
* **Solution**: Express + PostgreSQL (transactions and SELECT FOR UPDATE), React dashboard (presentation only), Jest under `tests/` with node + jsdom projects, Docker for Postgres + app, and evaluation script writing a JSON report.
* **Trade-offs**: Put Jest config in `tests/` for subfolder-specific layout; that required fixing rootDir and setup path so it works from root and in Docker. Added explicit pool teardown so Jest exits.
* **Why this works**: Serializing purchase checks on the `raffle_meta` row guarantees exactly one writer at a time for the critical section; total and per-user counts stay consistent.
* **When to revisit**: If we add multiple raffles or sharding, we’d need a different locking or partitioning strategy; current design is single-raffle and single-DB.
