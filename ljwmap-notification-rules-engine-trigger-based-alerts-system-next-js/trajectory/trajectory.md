# Trajectory: Notification Rules Engine (Next.js/TypeScript)

## Analysis
The core engineering challenge is the deterministic transformation of arbitrary JSON event payloads into filtered notification triggers without code changes.

### Reasoning Pivot
A naive implementation would utilize hardcoded event handlers or high-level `if/else` logic. 
**The Pivot:** We must treat "Logic as Data." By moving rule evaluation into a relational engine, we shift the complexity from **Maintenance** (adding code for every new scenario) to **Architecture** (building a generic evaluator that maps `Context` + `RuleSet` to `Result`).

### Constraints & Invariants
*   **Next.js App Router**: Enforces stateless execution; requires robust API route validation.
*   **Prisma/SQL**: Necessitates a strictly typed schema while accommodating polymorphic event payloads.
*   **Precision**: Must handle nested JSON paths (e.g., `metadata.user.role`) and support type-safe comparison (casting string-stored rule values to numeric event data).

## Strategy

### 1. Normalized Relational Logic
Instead of storing logic as unsearchable JSON blobs, I utilized a **Rule-to-Condition (1:N)** relational model.
*   **Advantage**: Allows the DB to enforce referential integrity and facilitates a modular UI where users can build complex boolean logic (`Condition A` AND `Condition B`) without syntax errors.

### 2. Evaluator Pattern (The Brain)
Implemented a decoupled logic engine in `src/lib/engine/`.
*   **Condition Matcher**: A pure-function utility that performs atomic comparisons.
*   **Rule Evaluator**: Orchestrates the fetch-evaluate-record lifecycle.
*   **Tradeoff**: Rules are filtered in-memory after an initial `eventType` query. For <1000 rules per event, this avoids complex, DB-specific JSON-path SQL queries and ensures environment portability.

### 3. Hermetic Environment & Reproducibility
Utilized a **Multi-stage Docker Build** to ensure "Bit-Level Reproducibility."
*   **Prisma 7 Architecture**: Migrated connection logic to `prisma.config.ts` to separate infrastructure settings from data models.
*   **SQLite Portability**: Used file-based persistence to ensure tests run identically on local machines and distributed training nodes.

## Execution

### Step 1: Data Modeling & Schema
Defined the `Rule`, `Condition`, `Event`, and `Notification` models.
*   **Self-Correction**: Initially considered a flat `Rule` table. Pivoted to a separate `Condition` table to support complex AND/OR logic and cleaner UI form-to-database mapping.

### Step 2: The Evaluation Machine
Developed `condition-matcher.ts` using functional recursion.
*   Implemented **Nested Path Traversal** to allow rules to target any key within a JSON payload.
*   Standardized operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`.

### Step 3: API Ingestion & Cooldowns
Built the `POST /api/events` route with **Zod validation**.
*   Implemented a **Cooldown Manager** that queries previous `Notification` records to prevent "Alert Fatigue."

### Step 4: Adversarial Integration Testing
Developed a suite of **165 Vitest cases**.
*   **Verification**: Proactively mocked database failures and malformed JSON payloads to prove the engine's resilience.
*   **Automation**: Built `evaluation/evaluation.js` to automate the "Before vs. After" logic flow verification.

## Resources
*   **Next.js Route Handlers**: [API Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) - Base for event ingestion.
*   **Prisma 7 Config**: [Datasource Migration Guide](https://pris.ly/d/prisma7-client-config) - Resolved breaking changes in environment variable handling.
*   **Vitest CLI**: [Root Flag Reference](https://vitest.dev/guide/cli.html#root) - Used for isolated repository testing.
*   **Zod**: [Type Inference Guide](https://zod.dev/?id=type-inference) - Ensured type safety between untyped JSON and TypeScript interfaces.
