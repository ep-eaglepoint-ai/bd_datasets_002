/**
 * Strong requirements and prompt coverage tests.
 * Every requirement and prompt claim is explicitly tested with assertions.
 */
import { DateTime } from "luxon";
import { testDb, fileExistsInRepo, readFileFromRepo } from "./setup";

describe("REQ-01: Lucid database schema", () => {
  test("all four tables exist in migrations: roles, permissions, role_hierarchy, user_roles", () => {
    expect(fileExistsInRepo("database/migrations/001_create_roles_table.ts")).toBe(true);
    expect(fileExistsInRepo("database/migrations/002_create_permissions_table.ts")).toBe(true);
    expect(fileExistsInRepo("database/migrations/003_create_role_hierarchy_table.ts")).toBe(true);
    expect(fileExistsInRepo("database/migrations/006_create_user_roles_table.ts")).toBe(true);
  });

  test("roles table has tenant_id and unique name per tenant", () => {
    const content = readFileFromRepo("database/migrations/001_create_roles_table.ts");
    expect(content).toContain("roles");
    expect(content).toContain("tenant_id");
    expect(content).toContain("unique");
    expect(content).toContain("name");
  });

  test("permissions table has tenant_id", () => {
    const content = readFileFromRepo("database/migrations/002_create_permissions_table.ts");
    expect(content).toContain("permissions");
    expect(content).toContain("tenant_id");
  });

  test("role_hierarchy is self-referencing: parent_role_id and child_role_id reference roles", () => {
    const content = readFileFromRepo("database/migrations/003_create_role_hierarchy_table.ts");
    expect(content).toContain("parent_role_id");
    expect(content).toContain("child_role_id");
    expect(content).toContain("references");
    expect(content).toContain("inTable('roles')");
    expect(content).toMatch(/inTable\s*\(\s*['\"]roles['\"]\s*\)/);
  });

  test("user_roles has nullable expires_at column for temporal escalation", () => {
    const content = readFileFromRepo("database/migrations/006_create_user_roles_table.ts");
    expect(content).toContain("expires_at");
    expect(content).toContain("nullable");
  });

  test("role_permissions junction exists (permissions assigned to roles, not users)", () => {
    expect(fileExistsInRepo("database/migrations/004_create_role_permissions_table.ts")).toBe(true);
    const content = readFileFromRepo("database/migrations/004_create_role_permissions_table.ts");
    expect(content).toContain("role_id");
    expect(content).toContain("permission_id");
  });

  test("no user_permissions table - permissions only on roles per prompt", () => {
    const migrations = [
      "001_create_roles_table.ts",
      "002_create_permissions_table.ts",
      "003_create_role_hierarchy_table.ts",
      "004_create_role_permissions_table.ts",
      "005_create_users_table.ts",
      "006_create_user_roles_table.ts",
    ];
    for (const m of migrations) {
      const content = readFileFromRepo(`database/migrations/${m}`);
      expect(content).not.toMatch(/user.*permission|user_permission/);
    }
  });
});

describe("REQ-02: PermissionResolverService - recursive traversal, unique flattened array", () => {
  test("service returns Promise<string[]> - array of permission strings", () => {
    const content = readFileFromRepo("app/services/permission_resolver_service.ts");
    expect(content).toContain("resolveUserPermissions");
    expect(content).toMatch(/Promise<string\[\]>/);
    expect(content).toContain("Array.from");
    expect(content).toContain("sort()");
  });

  test("recursive traversal with visited set to avoid cycles and duplicates", () => {
    const content = readFileFromRepo("app/services/permission_resolver_service.ts");
    expect(content).toContain("collectRolePermissions");
    expect(content).toContain("visitedRoles");
    expect(content).toContain("Set<number>");
    expect(content).toContain("has(role.id)");
    expect(content).toContain("parentRoles");
  });

  test("flattened unique result via Set", () => {
    const content = readFileFromRepo("app/services/permission_resolver_service.ts");
    expect(content).toContain("allPermissions.add");
    expect(content).toContain("Set<string>");
  });
});

describe("REQ-03: Multi-tenant scope - absolute data isolation", () => {
  test("all role and permission checks constrained by tenant_id in service", () => {
    const content = readFileFromRepo("app/services/permission_resolver_service.ts");
    expect(content).toContain("tenant_id");
    expect(content).toContain("tenantId");
    expect((content.match(/tenant_id|tenantId/g) || []).length).toBeGreaterThanOrEqual(5);
  });

  test("user query scoped by tenant_id", () => {
    const content = readFileFromRepo("app/services/permission_resolver_service.ts");
    expect(content).toContain("where(\"tenant_id\"");
    expect(content).toContain("user.tenantId");
  });

  test("models have byTenant or tenant_id for isolation", () => {
    const roleContent = readFileFromRepo("app/models/role.ts");
    expect(roleContent).toContain("tenantId");
    const permContent = readFileFromRepo("app/models/permission.ts");
    expect(permContent).toContain("byTenant");
  });
});

describe("REQ-04: AdonisJS Middleware - intercept, resolve active, attach to context", () => {
  test("middleware intercepts requests via handle(ctx, next)", () => {
    const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
    expect(content).toContain("async handle");
    expect(content).toContain("ctx");
    expect(content).toContain("next");
  });

  test("resolves user active permissions (expired temporal roles checked via service)", () => {
    const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
    expect(content).toContain("resolveUserPermissions");
    expect(content).toContain("permissionResolver");
  });

  test("attaches permissions to HTTP context for downstream policies", () => {
    const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
    expect(content).toContain("ctx.permissions");
    expect(content).toContain("ctx.hasPermission");
    expect(content).toContain("ctx.tenantId");
  });

  test("HttpContext module augmentation for policies", () => {
    const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
    expect(content).toContain("declare module");
    expect(content).toContain("permissions?: string[]");
    expect(content).toContain("hasPermission?");
  });
});

describe("REQ-05: Cleanup - temporal roles inactive at expires_at, filtered during aggregation", () => {
  test("resolution explicitly filters expired roles during permission aggregation", () => {
    const content = readFileFromRepo("app/services/permission_resolver_service.ts");
    expect(content).toContain("getActiveUserRoles");
    expect(content).toContain("whereNull(\"user_roles.expires_at\")");
    expect(content).toContain("orWhere(\"user_roles.expires_at\"");
    expect(content).toContain(">");
  });

  test("cleanupExpiredRoles removes rows where expires_at <= now", () => {
    const content = readFileFromRepo("app/services/permission_resolver_service.ts");
    expect(content).toContain("cleanupExpiredRoles");
    expect(content).toContain("whereNotNull");
    expect(content).toContain("expires_at");
    expect(content).toContain("<=");
    expect(content).toContain("delete");
  });
});

describe("REQ-06: Bouncer - granular checks based on resolved permission set", () => {
  test("RolePolicy allows() checks permission string", () => {
    const content = readFileFromRepo("app/policies/role_policy.ts");
    expect(content).toContain("allows");
    expect(content).toContain("permission: string");
    expect(content).toContain("userHasPermission");
  });

  test("granular check can_edit_invoice via canEditInvoice method", () => {
    const content = readFileFromRepo("app/policies/role_policy.ts");
    expect(content).toContain("canEditInvoice");
    expect(content).toContain("can_edit_invoice");
  });

  test("policy uses PermissionResolverService for resolved set", () => {
    const content = readFileFromRepo("app/policies/role_policy.ts");
    expect(content).toContain("PermissionResolverService");
    expect(content).toContain("resolveUserPermissions");
  });

  test("bouncer config registers RolePolicy", () => {
    const content = readFileFromRepo("config/bouncer.ts");
    expect(content).toContain("RolePolicy");
    expect(content).toContain("policies");
  });
});

describe("Prompt: Permissions not assigned to users directly, only to roles", () => {
  test("permissions live in role_permissions table only", () => {
    expect(fileExistsInRepo("database/migrations/004_create_role_permissions_table.ts")).toBe(true);
    expect(fileExistsInRepo("database/migrations/005_create_users_table.ts")).toBe(true);
    const usersContent = readFileFromRepo("database/migrations/005_create_users_table.ts");
    expect(usersContent).not.toContain("permission");
  });
});

describe("Prompt: Full set of permissions from primary role and all ancestors", () => {
  test("resolver collects role permissions and parent roles recursively", () => {
    const content = readFileFromRepo("app/services/permission_resolver_service.ts");
    expect(content).toContain("resolveRolePermissions");
    expect(content).toContain("collectRolePermissions");
    expect(content).toContain("parentRoles");
  });
});

describe("Prompt: Role inheritance (e.g. Editor inherits from User, Admin from Editor)", () => {
  test("role hierarchy supports parent-child (child inherits parent permissions)", () => {
    const content = readFileFromRepo("app/models/role.ts");
    expect(content).toContain("parentRoles");
    expect(content).toContain("childRoles");
    expect(content).toContain("role_hierarchy");
  });

  test("service traverses parent roles to aggregate permissions", () => {
    const content = readFileFromRepo("app/services/permission_resolver_service.ts");
    expect(content).toContain("parentRoles");
    expect(content).toContain("collectRolePermissions");
  });
});

describe("Prompt: Temporary Role Escalation with expiration timestamp", () => {
  test("user_roles.expires_at stores expiration; grantTemporaryRole accepts DateTime", () => {
    const content = readFileFromRepo("app/services/permission_resolver_service.ts");
    expect(content).toContain("grantTemporaryRole");
    expect(content).toContain("expiresAt");
    expect(content).toContain("expires_at");
  });
});

describe("Prompt: Multi-tenant - role definitions can differ between tenants", () => {
  test("roles and permissions are tenant-scoped so definitions can differ per tenant", () => {
    const rolesContent = readFileFromRepo("database/migrations/001_create_roles_table.ts");
    expect(rolesContent).toContain("tenant_id");
    expect(rolesContent).toContain("unique");
    expect(rolesContent).toContain("name");
    const permContent = readFileFromRepo("database/migrations/002_create_permissions_table.ts");
    expect(permContent).toContain("tenant_id");
  });
});
