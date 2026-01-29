import { testDb, fileExistsInRepo, readFileFromRepo } from "./setup";

describe("RolePolicy", () => {
  let tenantId: number;
  let user: any;

  beforeEach(() => {
    tenantId = 1;
    user = testDb.insert("users", {
      email: "test@example.com",
      tenant_id: tenantId,
    });
  });

  describe("TC-09: REQ-06 - Bouncer integration allows method", () => {
    test("should have RolePolicy file", () => {
      expect(fileExistsInRepo("app/policies/role_policy.ts")).toBe(true);
    });

    test("should extend BasePolicy", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      
      expect(content).toContain("extends BasePolicy");
      expect(content).toContain("@adonisjs/bouncer");
    });

    test("should implement allows method", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      
      expect(content).toContain("async allows");
      expect(content).toContain("user: User");
      expect(content).toContain("permission: string");
    });

    test("should use PermissionResolverService", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      
      expect(content).toContain("PermissionResolverService");
      expect(content).toContain("permissionResolver");
      expect(content).toContain("userHasPermission");
    });

    test("should handle tenant ID parameter", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      
      expect(content).toContain("tenantId");
      expect(content).toContain("user.tenantId");
    });

    test("should return AuthorizerResponse", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      
      expect(content).toContain("AuthorizerResponse");
      expect(content).toContain("Promise<AuthorizerResponse>");
    });
  });

  describe("TC-10: REQ-06 - Specific permission methods", () => {
    test("should implement canEditInvoice method", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      
      expect(content).toContain("canEditInvoice");
      expect(content).toContain("can_edit_invoice");
    });

    test("should implement canViewReports method", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      
      expect(content).toContain("canViewReports");
      expect(content).toContain("can_view_reports");
    });

    test("should implement canManageUsers method", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      
      expect(content).toContain("canManageUsers");
      expect(content).toContain("can_manage_users");
    });

    test("should implement canAccessAdmin method", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      
      expect(content).toContain("canAccessAdmin");
      expect(content).toContain("can_access_admin");
    });
  });

  describe("TC-11: REQ-06 - Bouncer granular check (e.g. allows('can_edit_invoice'))", () => {
    test("allows(user, permission) delegates to PermissionResolverService.userHasPermission", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      expect(content).toContain("allows");
      expect(content).toContain("userHasPermission");
      expect(content).toContain("user.id");
      expect(content).toContain("effectiveTenantId");
    });

    test("canEditInvoice checks resolved permission set for 'can_edit_invoice'", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      expect(content).toContain("canEditInvoice");
      expect(content).toContain("'can_edit_invoice'");
    });
  });

  describe("TC-12: REQ-06 - Multiple permission checks", () => {
    test("should implement hasAnyPermission method", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      
      expect(content).toContain("hasAnyPermission");
      expect(content).toContain("permissions: string[]");
      expect(content).toContain("some");
    });

    test("should implement hasAllPermissions method", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      
      expect(content).toContain("hasAllPermissions");
      expect(content).toContain("every");
    });

    test("should resolve user permissions for multiple checks", () => {
      const content = readFileFromRepo("app/policies/role_policy.ts");
      
      expect(content).toContain("resolveUserPermissions");
    });
  });
});
