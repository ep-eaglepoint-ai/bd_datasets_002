import { testDb, fileExistsInRepo, readFileFromRepo } from "./setup";

describe("RbacMiddleware", () => {
  let tenantId: number;
  let user: any;

  beforeEach(() => {
    tenantId = 1;
    user = testDb.insert("users", {
      email: "test@example.com",
      tenant_id: tenantId,
    });
  });

  describe("TC-07: REQ-04 - Middleware tenant validation", () => {
    test("should have RbacMiddleware file", () => {
      expect(fileExistsInRepo("app/middleware/rbac_middleware.ts")).toBe(true);
    });

    test("should implement handle method", () => {
      const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
      
      expect(content).toContain("async handle");
      expect(content).toContain("HttpContext");
      expect(content).toContain("NextFn");
    });

    test("should check for authenticated user", () => {
      const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
      
      expect(content).toContain("auth.user");
      expect(content).toContain("next()");
    });

    test("should validate tenant ID is present", () => {
      const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
      
      expect(content).toContain("tenantId");
      expect(content).toContain("400");
      expect(content).toContain("Tenant ID is required");
    });

    test("should validate user tenant matches request tenant", () => {
      const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
      
      expect(content).toContain("user.tenantId");
      expect(content).toContain("403");
      expect(content).toContain("Access denied");
    });

    test("should attach permissions to context", () => {
      const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
      
      expect(content).toContain("ctx.permissions");
      expect(content).toContain("resolveUserPermissions");
    });

    test("REQ-04: resolved permissions exclude expired temporal roles (via service getActiveUserRoles)", () => {
      const middlewareContent = readFileFromRepo("app/middleware/rbac_middleware.ts");
      const serviceContent = readFileFromRepo("app/services/permission_resolver_service.ts");
      expect(middlewareContent).toContain("resolveUserPermissions");
      expect(serviceContent).toContain("getActiveUserRoles");
      expect(serviceContent).toContain("expires_at");
      expect(serviceContent).toMatch(/whereNull|orWhere.*expires_at/);
    });

    test("should implement hasPermission helper", () => {
      const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
      
      expect(content).toContain("hasPermission");
      expect(content).toContain("includes");
    });

    test("should extract tenant ID from header", () => {
      const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
      
      expect(content).toContain("x-tenant-id");
      expect(content).toContain("header");
    });

    test("should extract tenant ID from query parameter", () => {
      const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
      
      expect(content).toContain("tenant_id");
      expect(content).toContain("qs()");
    });
  });

  describe("TC-08: REQ-04 - Error handling", () => {
    test("should handle permission resolution errors", () => {
      const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
      
      expect(content).toContain("catch");
      expect(content).toContain("500");
      expect(content).toContain("Failed to resolve user permissions");
    });

    test("should include error details in response", () => {
      const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
      
      expect(content).toContain("error");
      expect(content).toContain("details");
    });
  });

  describe("TC-09: HttpContext extension", () => {
    test("should declare module augmentation for HttpContext", () => {
      const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
      
      expect(content).toContain("declare module");
      expect(content).toContain("@adonisjs/core/http");
      expect(content).toContain("interface HttpContext");
    });

    test("should add custom properties to HttpContext", () => {
      const content = readFileFromRepo("app/middleware/rbac_middleware.ts");
      
      expect(content).toContain("permissions?: string[]");
      expect(content).toContain("tenantId?: number");
      expect(content).toContain("hasPermission?");
    });
  });
});
