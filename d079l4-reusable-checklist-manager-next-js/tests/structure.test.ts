import * as fs from "fs";
import * as path from "path";

describe("Next.js App Router Structure (Req 1)", () => {
  const repoPath = path.join(__dirname, "..");

  describe("Directory Structure", () => {
    it("should have app directory", () => {
      const appDir = path.join(repoPath, "app");
      expect(fs.existsSync(appDir)).toBe(true);
      expect(fs.statSync(appDir).isDirectory()).toBe(true);
    });

    it("should have main page.tsx", () => {
      const mainPage = path.join(repoPath, "app", "page.tsx");
      expect(fs.existsSync(mainPage)).toBe(true);
    });

    it("should have layout.tsx", () => {
      const layout = path.join(repoPath, "app", "layout.tsx");
      expect(fs.existsSync(layout)).toBe(true);
    });

    it("should have templates route", () => {
      const templatesDir = path.join(repoPath, "app", "templates");
      expect(fs.existsSync(templatesDir)).toBe(true);
      expect(fs.statSync(templatesDir).isDirectory()).toBe(true);
    });

    it("should have instances route", () => {
      const instancesDir = path.join(repoPath, "app", "instances");
      expect(fs.existsSync(instancesDir)).toBe(true);
      expect(fs.statSync(instancesDir).isDirectory()).toBe(true);
    });

    it("should have dynamic instance route [id]", () => {
      const instanceIdDir = path.join(repoPath, "app", "instances", "[id]");
      expect(fs.existsSync(instanceIdDir)).toBe(true);
      expect(fs.statSync(instanceIdDir).isDirectory()).toBe(true);
    });
  });

  describe("TypeScript Configuration", () => {
    it("should have tsconfig.json", () => {
      const tsconfig = path.join(repoPath, "tsconfig.json");
      expect(fs.existsSync(tsconfig)).toBe(true);
    });

    it("should have valid tsconfig.json", () => {
      const tsconfig = path.join(repoPath, "tsconfig.json");
      const content = fs.readFileSync(tsconfig, "utf-8");
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it("should configure path aliases", () => {
      const tsconfig = path.join(repoPath, "tsconfig.json");
      const content = JSON.parse(fs.readFileSync(tsconfig, "utf-8"));
      expect(content.compilerOptions?.paths).toBeDefined();
      expect(content.compilerOptions?.paths["@/*"]).toBeDefined();
    });
  });

  describe("Next.js Configuration", () => {
    it("should have next.config.ts or next.config.js", () => {
      const nextConfigTs = path.join(repoPath, "next.config.ts");
      const nextConfigJs = path.join(repoPath, "next.config.js");
      const hasConfig =
        fs.existsSync(nextConfigTs) || fs.existsSync(nextConfigJs);
      expect(hasConfig).toBe(true);
    });
  });

  describe("Server Actions", () => {
    it("should have actions.ts with 'use server' directive", () => {
      const actionsFile = path.join(repoPath, "app", "actions.ts");
      expect(fs.existsSync(actionsFile)).toBe(true);

      const content = fs.readFileSync(actionsFile, "utf-8");
      expect(content).toContain('"use server"');
    });

    it("should export Server Actions", () => {
      const actionsFile = path.join(repoPath, "app", "actions.ts");
      const content = fs.readFileSync(actionsFile, "utf-8");

      // Check for key Server Actions
      expect(content).toContain("export async function createTemplate");
      expect(content).toContain("export async function createInstance");
      expect(content).toContain("export async function toggleInstanceItem");
      expect(content).toContain("export async function updateInstanceStatus");
    });
  });

  describe("Prisma Setup", () => {
    it("should have prisma directory", () => {
      const prismaDir = path.join(repoPath, "prisma");
      expect(fs.existsSync(prismaDir)).toBe(true);
      expect(fs.statSync(prismaDir).isDirectory()).toBe(true);
    });

    it("should have schema.prisma", () => {
      const schema = path.join(repoPath, "prisma", "schema.prisma");
      expect(fs.existsSync(schema)).toBe(true);
    });

    it("should have Prisma client wrapper", () => {
      const prismaClient = path.join(repoPath, "lib", "prisma.ts");
      expect(fs.existsSync(prismaClient)).toBe(true);
    });

    it("should define required models in schema", () => {
      const schema = path.join(repoPath, "prisma", "schema.prisma");
      const content = fs.readFileSync(schema, "utf-8");

      expect(content).toContain("model Template");
      expect(content).toContain("model TemplateItem");
      expect(content).toContain("model ChecklistInstance");
      expect(content).toContain("model InstanceItem");
    });
  });

  describe("Component Structure", () => {
    it("should have components directory", () => {
      const componentsDir = path.join(repoPath, "components");
      expect(fs.existsSync(componentsDir)).toBe(true);
      expect(fs.statSync(componentsDir).isDirectory()).toBe(true);
    });

    it("should have lib directory for utilities", () => {
      const libDir = path.join(repoPath, "lib");
      expect(fs.existsSync(libDir)).toBe(true);
      expect(fs.statSync(libDir).isDirectory()).toBe(true);
    });

    it("should have schemas.ts for validation", () => {
      const schemas = path.join(repoPath, "lib", "schemas.ts");
      expect(fs.existsSync(schemas)).toBe(true);

      const content = fs.readFileSync(schemas, "utf-8");
      expect(content).toContain('import { z } from "zod"');
    });
  });

  describe("Package Configuration", () => {
    it("should have package.json", () => {
      const packageJson = path.join(repoPath, "package.json");
      expect(fs.existsSync(packageJson)).toBe(true);
    });

    it("should include Next.js dependency", () => {
      const packageJson = path.join(repoPath, "package.json");
      const content = JSON.parse(fs.readFileSync(packageJson, "utf-8"));
      expect(content.dependencies?.next).toBeDefined();
    });

    it("should include React dependencies", () => {
      const packageJson = path.join(repoPath, "package.json");
      const content = JSON.parse(fs.readFileSync(packageJson, "utf-8"));
      expect(content.dependencies?.react).toBeDefined();
      expect(content.dependencies?.["react-dom"]).toBeDefined();
    });

    it("should include Prisma dependencies", () => {
      const packageJson = path.join(repoPath, "package.json");
      const content = JSON.parse(fs.readFileSync(packageJson, "utf-8"));
      expect(content.dependencies?.["@prisma/client"]).toBeDefined();
      expect(content.devDependencies?.prisma).toBeDefined();
    });

    it("should include TypeScript", () => {
      const packageJson = path.join(repoPath, "package.json");
      const content = JSON.parse(fs.readFileSync(packageJson, "utf-8"));
      expect(content.devDependencies?.typescript).toBeDefined();
    });

    it("should include Zod for validation", () => {
      const packageJson = path.join(repoPath, "package.json");
      const content = JSON.parse(fs.readFileSync(packageJson, "utf-8"));
      expect(content.dependencies?.zod).toBeDefined();
    });
  });
});
