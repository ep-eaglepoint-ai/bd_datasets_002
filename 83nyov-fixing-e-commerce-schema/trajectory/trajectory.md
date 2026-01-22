# Trajectory (Thinking Process for Schema Refactoring)

## 1. Audit the Original Schema (Identify Structural & Relational Flaws)

I audited the original Prisma schema. It suffered from circular ownership (Billboard ↔ Store ↔ Category), critical missing entities (User/Tenant root), implicit and ambiguous relationships, redundant foreign keys, and missing indexes. This led to a schema that was fragile, impossible to validate, and unsuitable for a multi-tenant SaaS application.

- **Learn about Prisma Relations**: [Prisma Relations Documentation](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- **Understanding Multi-Tenancy**: [Multi-Tenancy Strategies](https://www.prisma.io/docs/guides/other/multi-tenancy)

## 2. Define a Schema Contract First

I defined the correction contract:

- **Explicit Relations**: All relations must be named to avoid ambiguity.
- **Tenant Enforcement**: Every entity must belong to a `Store` (Root), and `Store` must belong to a `User`.
- **Cascading Deletes**: Deleting a root entity (Store/User) must clean up children to prevent orphaned data.
- **Broken Loops**: Circular dependencies must be resolving by loosening one side (e.g., optional `billboardId` on `Category`).
- **Validatable**: The schema must pass `prisma validate` without errors.

## 3. Rework the Data Model for Identity & Tenancy

I introduced the missing `User` model to act as the authentication root. I linked `Store` to `User` tightly. This ensures that every piece of data in the system has a clear ownership lineage, which is critical for SaaS security and partitioning.

## 4. Make Relations Explicit & Deterministic

I replaced implicit foreign keys with explicit `@relation` attributes containing named references (e.g., `@relation("StoreToProduct")`). Implicit relations often lead to confusing migration errors and unexpected query behavior when multiple paths exist between models.

## 5. Resolve Circular Dependencies & Coupling

The original schema had `Billboard` requiring `Category` and `Category` requiring `Billboard` while both required `Store`, creating a "deadlock" for creation. I decoupled them by making the `Billboard` relation on `Category` optional (`billboardId String?`) with `onDelete: SetNull`. This allows for smoother creation flows and safe deletion constraints.

## 6. Enforce Database Integrity with Indexes

I added `@@index` directives for all foreign keys (e.g., `@@index([storeId])`). Since `relationMode = "prisma"` is used (typical for PlanetScale or environments without foreign key constraints), these indexes are mandatory for performance and to allow Prisma to emulate referential integrity efficiently.

## 7. Define Cascade Actions for Data Hygiene

I explicitly defined `onDelete` behaviors.

- **Cascade**: For loose children like `Products`, `Orders`, `Sizes` when a `Store` is deleted.
- **Restrict**: For `OrderItems` referencing `Products`, ensuring historical interaction data isn't accidentally wiped if a product is removed (or ensuring the user archives instead of deletes).
- **SetNull**: For optional cosmetic links like `Category` -> `Billboard`.

## 8. Prevent Orphaned or Redundant Data

I removed redundant fields and verified that arrays (connections) on the parent side matched the foreign keys on the child side. This cleaned up the "N+1" confusion at the schema level by ensuring every relation had exactly one clear path.

## 9. Verification via containerized Tests

I implemented a dual-stage verification pipeline using Docker:

1.  **Test-Before**: Validates that the original schema _fails_ logic and validation checks as expected.
2.  **Test-After**: Runs the new schema against `prisma validate` and a TypeScript test suite (`tests/schema.test.ts`) to ensure all structural requirements (User model, named relations, cascade rules) are met.

## 10. Result: A Stable, SaaS-Ready Schema

The solution produced a logically consistent `schema.prisma` that supports multi-tenancy, handles data cleanup automatically via cascades, prevents circular locking, and passes all strict validation checks.

---

## Trajectory Transferability Notes

The above trajectory is designed for **Schema Refactoring**. The steps outlined in it represent reusable thinking nodes (audit, contract definition, structural changes, execution, and verification).

The same nodes can be reused to transfer this trajectory to other hard-work categories (such as full-stack development, performance optimization, testing, and code generation) by changing the focus of each node, not the structure.

Below are the nodes extracted from this trajectory. These nodes act as a template that can be mapped to other categories by adapting the inputs, constraints, and validation signals specific to each task type.

### Refactoring → Database Design / Migration

- **Audit**: Analyze existing ERD/Schema for accumulation of technical debt or scaling bottlenecks.
- **Contract**: Define normal forms (3NF), naming conventions, and partition strategies.
- **Execution**: Write SQL/Prisma migrations, data backfill scripts, and constrain logic.
- **Data Model**: Optimize types, leverage enums, and properly index for query patterns.

### Refactoring → System Architecture

- **Audit**: Identify "God classes", tight coupling, or single points of failure.
- **Contract**: Define interface boundaries (API specs) and ownership domains (DDD).
- **Execution**: Break monoliths into modules/services, introduce messaging queues.
- **Verification**: Integration tests ensuring decoupled components still transact correctly.

### Core Principle (Applies to All)

- The trajectory structure stays the same
- Only the focus and artifacts change
- **Audit → Contract → Design → Execute → Verify** remains constant
