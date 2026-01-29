# Trajectory: Stateful Conflict CRM Engine

## Problem Analysis
Build a Go-based CRM system preventing "lost update" anomalies in concurrent environments using optimistic locking, state machine validation, and HTMX for conflict resolution UI.

## Understand Optimistic Concurrency Control (OCC)
Identified that pessimistic locking (SELECT FOR UPDATE) creates contention. OCC uses version fields with compare-and-swap for better throughput in read-heavy workloads.

**Learn about OCC vs Pessimistic Locking:**
- Video: Understanding Optimistic Locking - https://youtu.be/tYzKi2q_fCk
- Article: Optimistic vs Pessimistic Locking - https://stackoverflow.com/questions/129329/optimistic-vs-pessimistic-locking

## Implement Version-Based Locking Pattern
Added `version` field (BIGINT) to Lead entity. Update query uses `WHERE id = ? AND version = ?` - if version mismatches, zero rows affected means concurrent modification detected.

**Key Insight:** Database atomically checks version and updates - no application-level locks needed.

Learn more: Database Concurrency Control - https://use-the-index-luke.com/sql/dml/update

## Design State Machine Validation
Enforced business rule: `LeadScore >= 80` required for CONVERTED status. Validation lives in domain layer (not infrastructure) for fail-fast behavior.

**Domain-Driven Design Reference:**
- Article: State Machines in Domain Models - https://martinfowler.com/bliki/DomainModel.html

## Apply Clean Architecture Pattern
Organized code in layers: Domain (pure logic) → UseCase (orchestration) → Infrastructure (PostgreSQL) → Delivery (HTTP + templates). Dependencies point inward.

**Structure:**
```
crm-engine/
├── domain/          # Business entities & rules
├── usecase/         # Application logic
├── infrastructure/  # Database implementation
└── delivery/        # HTTP handlers + templates
```

**Clean Architecture Guide:** https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html

## Consolidate Frontend into Backend (HTMX Philosophy)
HTMX is designed for server-side rendering, not client-side SPAs. Moved templates into backend to serve HTML and API from single Go server - eliminates CORS, simplifies deployment.

**HTMX Best Practices:**
- Official Docs: When to use HTMX - https://htmx.org/essays/
- Video: HTMX Architecture - https://youtu.be/3GObi93tjZI

## Handle HTTP 409 Conflict with Fresh Data
When version mismatch occurs (409 status), return fresh entity data so UI can reload form with current version and inform user of conflict.

## Use HTTP 422 for Invalid State Transitions
Return 422 Unprocessable Entity when state machine validation fails (e.g., score < 80 for CONVERTED). Separates business rule violations from conflicts.

**HTTP Status Code Guide:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422

## Test Concurrency with sync.WaitGroup
Wrote tests spawning 10 goroutines updating same lead simultaneously. Only one succeeds per version, proving atomic compare-and-swap works correctly.

**Go Concurrency Testing:**
- Video: Testing Concurrent Code in Go - https://youtu.be/ndmB0bj7eyw
- Docs: sync.WaitGroup - https://pkg.go.dev/sync#WaitGroup

## Organize Tests: Meta + Functional Separation
Structured tests with meta validation at root, functional tests (concurrency, state machine, HTTP) in `functional/` package for clear separation of concerns.

**Test Organization Pattern:** https://go.dev/doc/tutorial/add-a-test

## Use PostgreSQL MVCC for Transactional Integrity
PostgreSQL's Multi-Version Concurrency Control handles concurrent transactions without blocking. Combined with OCC version checks ensures data consistency.

**PostgreSQL MVCC Explained:** https://www.postgresql.org/docs/current/mvcc-intro.html

## Result: Production-Grade Concurrent System
System uses optimistic locking to prevent lost updates, enforces business rules via state machine, handles conflicts gracefully with 409/422 responses, and tests prove correctness under 10-way concurrency. Single-server architecture simplifies deployment while maintaining clean separation of concerns.