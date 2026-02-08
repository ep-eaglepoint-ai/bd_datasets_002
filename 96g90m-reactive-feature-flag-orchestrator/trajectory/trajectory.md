# Trajectory (Thinking Process for Feature Flag Orchestrator)

## 1. Analyze Requirements and Contracts

I decomposed the prompt into explicit contracts: a shared Zod discriminated union schema, a Zustand draft vs persisted lifecycle with real-time validation, a server route that enforces version-based optimistic concurrency control, and atomic file persistence that never writes invalid data.

## 2. Define Shared Schema as the Source of Truth

I created a single Zod schema that models flag variants (BOOLEAN, PERCENTAGE, ENUM) and a configuration envelope. This schema is imported by both the UI store and the API route to enforce parity and DRY validation.

## 3. Implement Zustand Draft Lifecycle

I modeled `persistedState` and `draftState`, tracked `isDirty`, and computed `validationErrors` from Zod on each keystroke. I added discard logic that re-fetches server state to avoid stale version drift.

## 4. Build Schema-Driven UI

I rendered inputs based on `flag.type`, reset values to safe defaults when a type changes, and added a top-level error summary to block sync when any flag is invalid.

## 5. Implement Server Gateway with Concurrency Control

I added a Next.js route handler that validates the payload, compares `version_id`, and only writes updates if versions match. On conflict, it returns a 409 with the current version.

## 6. Ensure Atomic File Persistence

I used a temp file + rename strategy so that validation failures or version conflicts leave `config.json` untouched.

## 7. Verification Strategy

I aligned tests to requirements: schema constraints, draft orchestration, real-time validation, concurrency collisions, server-side validation, and type-integrity errors.

## Resources

- Zod discriminated unions: https://zod.dev/?id=discriminated-unions
- Zustand patterns: https://zustand-demo.pmnd.rs/
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
