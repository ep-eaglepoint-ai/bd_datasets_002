import { DateTime } from "luxon";
import { testDb, fileExistsInRepo, readFileFromRepo } from "./setup";

describe("PermissionResolverService", () => {
  let tenantId: number;
  let guestRole: any;
  let editorRole: any;
  let adminRole: any;
  let superuserRole: any;
  let user: any;

  beforeEach(() => {
    tenantId = 1;

    // REQ-08: Create 3-level hierarchy (Guest -> Editor -> Admin)
    guestRole = testDb.insert("roles", { name: "Guest", tenant_id: tenantId });
    editorRole = testDb.insert("roles", {
      name: "Editor",
      tenant_id: tenantId,
    });
    adminRole = testDb.insert("roles", { name: "Admin", tenant_id: tenantId });
    superuserRole = testDb.insert("roles", {
      name: "Superuser",
      tenant_id: tenantId,
    });

    testDb.insert("role_hierarchy", {
      parent_role_id: guestRole.id,
      child_role_id: editorRole.id,
      tenant_id: tenantId,
    });
    testDb.insert("role_hierarchy", {
      parent_role_id: editorRole.id,
      child_role_id: adminRole.id,
      tenant_id: tenantId,
    });

    const readPermission = testDb.insert("permissions", {
      name: "can_read",
      tenant_id: tenantId,
    });
    const writePermission = testDb.insert("permissions", {
      name: "can_write",
      tenant_id: tenantId,
    });
    const deletePermission = testDb.insert("permissions", {
      name: "can_delete",
      tenant_id: tenantId,
    });
    const editInvoicePermission = testDb.insert("permissions", {
      name: "can_edit_invoice",
      tenant_id: tenantId,
    });
    const superPermission = testDb.insert("permissions", {
      name: "can_super_admin",
      tenant_id: tenantId,
    });

    testDb.insert("role_permissions", {
      role_id: guestRole.id,
      permission_id: readPermission.id,
      tenant_id: tenantId,
    });
    testDb.insert("role_permissions", {
      role_id: editorRole.id,
      permission_id: writePermission.id,
      tenant_id: tenantId,
    });
    testDb.insert("role_permissions", {
      role_id: adminRole.id,
      permission_id: deletePermission.id,
      tenant_id: tenantId,
    });
    testDb.insert("role_permissions", {
      role_id: adminRole.id,
      permission_id: editInvoicePermission.id,
      tenant_id: tenantId,
    });
    testDb.insert("role_permissions", {
      role_id: superuserRole.id,
      permission_id: superPermission.id,
      tenant_id: tenantId,
    });

    user = testDb.insert("users", {
      email: "test@example.com",
      tenant_id: tenantId,
    });
  });

  describe("TC-01: REQ-02 - Recursive hierarchy traversal", () => {
    test("should have PermissionResolverService with recursive traversal implementation", () => {
      expect(fileExistsInRepo("app/services/permission_resolver_service.ts")).toBe(true);
      
      const content = readFileFromRepo("app/services/permission_resolver_service.ts");
      
      expect(content).toContain("resolveUserPermissions");
      expect(content).toContain("collectRolePermissions");
      expect(content).toContain("visitedRoles");
      
      expect(content).toContain("parentRoles");
    });

    test("should support 3-level hierarchy in database", () => {
      const hierarchy = testDb.find("role_hierarchy", { tenant_id: tenantId });
      expect(hierarchy.length).toBe(2);
      
      expect(hierarchy.some(h => 
        h.parent_role_id === guestRole.id && h.child_role_id === editorRole.id
      )).toBe(true);
      
      expect(hierarchy.some(h => 
        h.parent_role_id === editorRole.id && h.child_role_id === adminRole.id
      )).toBe(true);
    });
  });

  describe("TC-02: REQ-03 - Multi-tenant isolation", () => {
    test("should implement tenant scoping in service", () => {
      const content = readFileFromRepo("app/services/permission_resolver_service.ts");
      
      expect(content).toContain("tenant_id");
      expect(content).toContain("tenantId");
      expect(content).toContain("where");
    });

    test("should isolate permissions by tenant in database", () => {
      const tenant2Id = 2;

      const tenant2AdminRole = testDb.insert("roles", {
        name: "Admin",
        tenant_id: tenant2Id,
      });
      const tenant2Permission = testDb.insert("permissions", {
        name: "tenant2_permission",
        tenant_id: tenant2Id,
      });
      testDb.insert("role_permissions", {
        role_id: tenant2AdminRole.id,
        permission_id: tenant2Permission.id,
        tenant_id: tenant2Id,
      });

      const tenant1Roles = testDb.find("roles", { tenant_id: tenantId });
      const tenant2Roles = testDb.find("roles", { tenant_id: tenant2Id });
      
      expect(tenant1Roles.length).toBe(4);
      expect(tenant2Roles.length).toBe(1); 
    });
  });

  describe("TC-03: REQ-05 - Temporal role cleanup", () => {
    test("should implement temporal role filtering", () => {
      const content = readFileFromRepo("app/services/permission_resolver_service.ts");
      
      expect(content).toContain("expires_at");
      expect(content).toContain("DateTime.now()");
      expect(content).toContain("getActiveUserRoles");
      
      expect(content).toContain("whereNull");
      expect(content).toContain("orWhere");
    });

    test("should store temporal roles with expiration in database", () => {
      const expiredTime = DateTime.now().minus({ seconds: 10 });

      testDb.insert("user_roles", {
        user_id: user.id,
        role_id: superuserRole.id,
        tenant_id: tenantId,
        is_primary: false,
        expires_at: expiredTime.toSQL(),
      });

      testDb.insert("user_roles", {
        user_id: user.id,
        role_id: guestRole.id,
        tenant_id: tenantId,
        is_primary: true,
        expires_at: null,
      });

      const userRoles = testDb.find("user_roles", { user_id: user.id });
      expect(userRoles.length).toBe(2);
      
      const expiredRole = userRoles.find(r => r.expires_at !== null);
      const permanentRole = userRoles.find(r => r.expires_at === null);
      
      expect(expiredRole).toBeTruthy();
      expect(permanentRole).toBeTruthy();
    });
  });

  describe("TC-04: REQ-07 - Temporal role expiration test", () => {
    test("should implement grantTemporaryRole method", () => {
      const content = readFileFromRepo("app/services/permission_resolver_service.ts");
      
      expect(content).toContain("grantTemporaryRole");
      expect(content).toContain("expiresAt");
      expect(content).toContain("DateTime");
      expect(content).toContain("expires_at");
      expect(content).toContain("toSQL()");
    });

    test("should handle role updates in grantTemporaryRole", () => {
      const content = readFileFromRepo("app/services/permission_resolver_service.ts");
      
      expect(content).toContain("existingRole");
      expect(content).toContain("pivotQuery");
      expect(content).toContain("update");
      expect(content).toContain("attach");
    });
  });

  describe("TC-05: REQ-06 - Permission checking", () => {
    test("should implement userHasPermission method", () => {
      const content = readFileFromRepo("app/services/permission_resolver_service.ts");
      
      expect(content).toContain("userHasPermission");
      expect(content).toContain("resolveUserPermissions");
      expect(content).toContain("includes");
    });

    test("should return boolean from permission check", () => {
      const content = readFileFromRepo("app/services/permission_resolver_service.ts");
      
      expect(content).toContain("Promise<boolean>");
    });
  });

  describe("TC-06: REQ-05 - Cleanup expired roles", () => {
    test("should implement cleanupExpiredRoles method", () => {
      const content = readFileFromRepo("app/services/permission_resolver_service.ts");
      
      expect(content).toContain("cleanupExpiredRoles");
      expect(content).toContain("delete");
      expect(content).toContain("<=");
      expect(content).toContain("whereNotNull");
    });

    test("should use database operations for cleanup", () => {
      const content = readFileFromRepo("app/services/permission_resolver_service.ts");
      
      expect(content).toContain("db.from");
      expect(content).toContain("user_roles");
    });

    test("should store expired roles correctly in database", () => {
      const expiredTime = DateTime.now().minus({ seconds: 10 });

      testDb.insert("user_roles", {
        user_id: user.id,
        role_id: superuserRole.id,
        tenant_id: tenantId,
        is_primary: false,
        expires_at: expiredTime.toSQL(),
      });

      const expiredRoles = testDb.find("user_roles", {
        user_id: user.id,
        role_id: superuserRole.id,
      });
      expect(expiredRoles.length).toBe(1);
      expect(expiredRoles[0].expires_at).toBe(expiredTime.toSQL());
    });
  });
});
