# Trajectory: Hierarchical RBAC with Temporal Grants

### 1. Audit / Requirements Analysis (What must be built?)
- Build an authorization layer that resolves **effective permissions** for a user across a **role hierarchy**, scoped by **tenant**, while honoring **time-limited role grants**.
- Key artifacts: models (`User`, `Role`, `Permission`), join tables (`role_hierarchy`, `role_permissions`, `user_roles` with nullable `expires_at`), and a resolver service that returns a unique, flattened array of permission strings.

### 2. Question Assumptions (Is there a simpler approach?)
- Initial scope: “just check permissions on a role.” Refined scope: resolve permissions across **all active roles + ancestors**, and do it safely under concurrency.
- Decision: keep resolution in a single service so middleware/policies/controllers don’t re-implement traversal logic.

### 3. Define Success Criteria (What does “done” mean?)
- **Correctness**: effective permissions include inherited permissions; cycles in hierarchy don’t infinite-loop; result is unique (no duplicate permission strings).
- **Isolation**: tenant scoping is enforced in all reads/writes; cross-tenant access is denied.
- **Temporal**: expired role grants don’t contribute to permissions; at or after `expires_at` roles are inactive; expired rows can be cleaned up.
- **Verification**: all Jest tests in `tests/` pass.

### 4. Map Requirements to Validation (How do we prove it?)
- **REQ-01** schema → `tests/database_schema.test.ts`, `tests/rbac_structure.test.ts`, `tests/requirements_coverage.test.ts`
- **REQ-02** hierarchy resolution, unique flattened array → `tests/permission_resolver_service.test.ts` (TC-01, TC-07, TC-08), `tests/rbac_functionality.test.ts` (TC-07)
- **REQ-03** multi-tenant isolation → `tests/rbac_functionality.test.ts` (TC-08), `tests/permission_resolver_service.test.ts` (TC-02, TC-09), `tests/requirements_coverage.test.ts`
- **REQ-04** middleware → `tests/rbac_middleware.test.ts`, `tests/rbac_functionality.test.ts` (TC-09)
- **REQ-05** temporal filter + cleanup → `tests/permission_resolver_service.test.ts` (TC-03, TC-06), `tests/temporal_1s_expiration.test.ts`, `tests/temporal_role_escalation.test.ts`, `tests/temporal_validation.test.ts`
- **REQ-06** Bouncer/policy → `tests/role_policy.test.ts`, `tests/rbac_functionality.test.ts` (TC-11)
- **REQ-07** temporal 1s test (succeeds then fails 1.1s later) → `tests/temporal_1s_expiration.test.ts`
- **REQ-08** 3-level hierarchy Guest→Editor→Admin, Admin has Guest+Editor permissions → `tests/permission_resolver_service.test.ts` (TC-07)

### 5. Scope the Solution (What’s the minimal implementation?)
- Create: DB schema (migrations in `repository_after/database/migrations/`), Lucid models/relations, `PermissionResolverService`, `RbacMiddleware`, `RolePolicy`, `RbacController`, and wiring in `config/bouncer.ts`.
- Avoid: premature caching/denormalization; keep API surface small (resolve + check + grant + cleanup).
- **Project layout**: Jest config lives in `tests/jest.config.cjs`; general config (`package.json`, `tsconfig.json`) only at repo root.

### 6. Trace Data/Control Flow (How does permission check work end-to-end?)
- Request → middleware extracts tenant → verify user belongs to tenant → resolve permissions (active roles only) → attach `ctx.permissions` + `ctx.hasPermission` → downstream controller/policy checks.
- Resolver flow: user → active `user_roles` (filter `expires_at`) → for each role: collect role permissions + parent roles recursively, using a visited set.

### 7. Anticipate Objections (What could go wrong?)
- Objection: “Recursion is slow (N+1 loads).” Counter: kept small for clarity; can later optimize with preloading/CTE/caching once correctness is proven.
- Objection: “Cleanup isn’t automatic.” Counter: resolution already ignores expired grants; cleanup is an optional maintenance job.
- Objection: “Tenant ID via header can be spoofed.” Counter: tenant is validated against `auth.user.tenantId` before any permission resolution.

### 8. Verify Invariants / Constraints (What must always hold?)
- **Must satisfy**: tenant filters on user/role/permission relations and pivot rows.
- **Must not violate**: expired grants must not be treated as active; hierarchy traversal must be cycle-safe.
- **Must support**: granting a temporary role updates existing pivot rows rather than duplicating assignments.

### 9. Execute with Surgical Precision (What order minimizes risk?)
- Step 1: schema + relations (unblocks queries). Risk: Medium (FK/pivot shape). Checkpoint: schema tests.
- Step 2: resolver service (core correctness). Risk: Medium. Checkpoint: hierarchy/temporal tests.
- Step 3: middleware + context typing (integration). Risk: Low. Checkpoint: middleware tests.
- Step 4: policy + bouncer registration. Risk: Low. Checkpoint: policy tests.

### 10. Measure Impact / Verify Completion (What evidence proves completion?)
- Evidence: Jest suite in `tests/` passes; `tests/requirements_coverage.test.ts` asserts every REQ and prompt claim; hierarchy tests confirm inherited permissions (Admin has Guest + Editor); temporal tests confirm expirations excluded and 1s→1.1s behavior.
- Quality bar: deterministic output ordering (sorted permissions), explicit tenant checks in query paths, no permissions on users (only on roles).

### 11. Document the Decision (Why this design, and when revisit?)
- Problem: compute tenant-safe effective permissions across nested roles with expiring grants.
- Solution: centralize resolution in `PermissionResolverService`, integrate via middleware/policy, and model temporal grants in `user_roles.expires_at`.
- Trade-offs: simplicity over optimal query count; revisit if role graphs are large (consider recursive SQL/closure table + caching).

### References
- AdonisJS Bouncer: https://docs.adonisjs.com/guides/authorization
- Luxon DateTime: https://moment.github.io/luxon/
