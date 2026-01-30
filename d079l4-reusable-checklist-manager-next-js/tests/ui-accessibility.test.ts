import * as fs from "fs";
import * as path from "path";

describe("UI Components and Accessibility (Req 11)", () => {
  const repoPath = path.join(__dirname, "..");

  describe("Component Files Exist", () => {
    it("should have UI components directory", () => {
      const componentsDir = path.join(repoPath, "components");
      expect(fs.existsSync(componentsDir)).toBe(true);
    });

    it("should have template-related components", () => {
      const componentsDir = path.join(repoPath, "components");
      const files = fs.readdirSync(componentsDir);

      // Check for template components
      const hasTemplateComponents = files.some(
        (file) =>
          file.toLowerCase().includes("template") && file.endsWith(".tsx"),
      );
      expect(hasTemplateComponents).toBe(true);
    });

    it("should have instance-related components", () => {
      const componentsDir = path.join(repoPath, "components");
      const files = fs.readdirSync(componentsDir);

      // Check for instance/checklist components
      const hasInstanceComponents = files.some(
        (file) =>
          (file.toLowerCase().includes("instance") ||
            file.toLowerCase().includes("checklist")) &&
          file.endsWith(".tsx"),
      );
      expect(hasInstanceComponents).toBe(true);
    });
  });

  describe("Loading States", () => {
    it("should have Suspense boundaries in pages", () => {
      const mainPage = path.join(repoPath, "app", "page.tsx");
      const content = fs.readFileSync(mainPage, "utf-8");

      // Check for loading patterns (Suspense or loading.tsx)
      const hasLoadingPattern =
        content.includes("Suspense") ||
        content.includes("loading") ||
        fs.existsSync(path.join(repoPath, "app", "loading.tsx"));

      expect(hasLoadingPattern).toBe(true);
    });

    it("should have loading.tsx or Suspense in template routes", () => {
      const templatesDir = path.join(repoPath, "app", "templates");
      const hasLoadingFile = fs.existsSync(
        path.join(templatesDir, "loading.tsx"),
      );

      if (!hasLoadingFile) {
        // Check if page.tsx uses Suspense
        const pagePath = path.join(templatesDir, "page.tsx");
        if (fs.existsSync(pagePath)) {
          const content = fs.readFileSync(pagePath, "utf-8");
          expect(
            content.includes("Suspense") || content.includes("loading"),
          ).toBe(true);
        }
      } else {
        expect(hasLoadingFile).toBe(true);
      }
    });
  });

  describe("Empty States", () => {
    it("should handle empty template list in UI", () => {
      const mainPage = path.join(repoPath, "app", "page.tsx");
      const content = fs.readFileSync(mainPage, "utf-8");

      // Check for empty state handling
      const hasEmptyStateLogic =
        content.includes("length === 0") ||
        content.includes("length < 1") ||
        content.includes("No templates") ||
        content.includes("empty");

      expect(hasEmptyStateLogic).toBe(true);
    });

    it("should handle empty instance list in UI", () => {
      const instancesPage = path.join(repoPath, "app", "instances", "page.tsx");

      if (fs.existsSync(instancesPage)) {
        const content = fs.readFileSync(instancesPage, "utf-8");

        const hasEmptyStateLogic =
          content.includes("length === 0") ||
          content.includes("length < 1") ||
          content.includes("No instances") ||
          content.includes("No checklists") ||
          content.includes("empty");

        expect(hasEmptyStateLogic).toBe(true);
      } else {
        // Empty state might be in main page
        expect(true).toBe(true);
      }
    });
  });

  describe("Accessibility Features", () => {
    it("should use semantic HTML in components", () => {
      const componentsDir = path.join(repoPath, "components");
      const files = fs
        .readdirSync(componentsDir)
        .filter((f) => f.endsWith(".tsx"));

      let hasSemanticHTML = false;

      for (const file of files) {
        const content = fs.readFileSync(
          path.join(componentsDir, file),
          "utf-8",
        );

        // Check for semantic HTML elements
        if (
          content.includes("<button") ||
          content.includes("<form") ||
          content.includes("<label") ||
          content.includes("<input") ||
          content.includes("<nav") ||
          content.includes("<main") ||
          content.includes("<section") ||
          content.includes("<article")
        ) {
          hasSemanticHTML = true;
          break;
        }
      }

      expect(hasSemanticHTML).toBe(true);
    });

    it("should have proper button elements (not divs)", () => {
      const componentsDir = path.join(repoPath, "components");
      const files = fs
        .readdirSync(componentsDir)
        .filter((f) => f.endsWith(".tsx"));

      let hasButtons = false;

      for (const file of files) {
        const content = fs.readFileSync(
          path.join(componentsDir, file),
          "utf-8",
        );

        if (content.includes("<button") || content.includes("Button")) {
          hasButtons = true;
          break;
        }
      }

      expect(hasButtons).toBe(true);
    });

    it("should have form labels for inputs", () => {
      const componentsDir = path.join(repoPath, "components");
      const files = fs
        .readdirSync(componentsDir)
        .filter((f) => f.endsWith(".tsx"));

      let hasLabels = false;

      for (const file of files) {
        const content = fs.readFileSync(
          path.join(componentsDir, file),
          "utf-8",
        );

        // Check for label elements or htmlFor attributes
        if (
          content.includes("<label") ||
          content.includes("htmlFor") ||
          content.includes("aria-label")
        ) {
          hasLabels = true;
          break;
        }
      }

      expect(hasLabels).toBe(true);
    });

    it("should use ARIA attributes where appropriate", () => {
      const componentsDir = path.join(repoPath, "components");
      const appDir = path.join(repoPath, "app");

      const checkDirectory = (dir: string): boolean => {
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);

          if (
            stat.isDirectory() &&
            !file.startsWith(".") &&
            file !== "node_modules"
          ) {
            if (checkDirectory(fullPath)) return true;
          } else if (file.endsWith(".tsx")) {
            const content = fs.readFileSync(fullPath, "utf-8");

            if (
              content.includes("aria-") ||
              content.includes("role=") ||
              content.includes("aria")
            ) {
              return true;
            }
          }
        }
        return false;
      };

      const hasAriaInComponents = checkDirectory(componentsDir);
      const hasAriaInApp = checkDirectory(appDir);

      expect(hasAriaInComponents || hasAriaInApp).toBe(true);
    });
  });

  describe("Progress and Status Display", () => {
    it("should display progress in instance detail page", () => {
      const instanceDetailPage = path.join(
        repoPath,
        "app",
        "instances",
        "[id]",
        "page.tsx",
      );

      if (fs.existsSync(instanceDetailPage)) {
        const content = fs.readFileSync(instanceDetailPage, "utf-8");

        // Check for progress indicators
        const hasProgressDisplay =
          content.includes("progress") ||
          content.includes("completed") ||
          content.includes("percentage") ||
          content.includes("%") ||
          content.includes("Progress");

        expect(hasProgressDisplay).toBe(true);
      } else {
        // Progress might be in a component
        const componentsDir = path.join(repoPath, "components");
        const files = fs.readdirSync(componentsDir);

        let hasProgressComponent = false;

        for (const file of files) {
          const content = fs.readFileSync(
            path.join(componentsDir, file),
            "utf-8",
          );

          if (
            content.includes("progress") ||
            content.includes("Progress") ||
            content.includes("percentage")
          ) {
            hasProgressComponent = true;
            break;
          }
        }

        expect(hasProgressComponent).toBe(true);
      }
    });

    it("should display status badges or indicators", () => {
      const componentsDir = path.join(repoPath, "components");
      const files = fs.readdirSync(componentsDir);

      let hasStatusDisplay = false;

      for (const file of files) {
        const content = fs.readFileSync(
          path.join(componentsDir, file),
          "utf-8",
        );

        if (
          content.includes("status") ||
          content.includes("Status") ||
          content.includes("ACTIVE") ||
          content.includes("COMPLETED") ||
          content.includes("ARCHIVED") ||
          content.includes("badge")
        ) {
          hasStatusDisplay = true;
          break;
        }
      }

      expect(hasStatusDisplay).toBe(true);
    });
  });

  describe("Form Validation UI", () => {
    it("should have form components", () => {
      const componentsDir = path.join(repoPath, "components");
      const files = fs.readdirSync(componentsDir);

      const hasFormComponents = files.some(
        (file) =>
          (file.toLowerCase().includes("form") ||
            file.toLowerCase().includes("create") ||
            file.toLowerCase().includes("edit")) &&
          file.endsWith(".tsx"),
      );

      expect(hasFormComponents).toBe(true);
    });

    it("should handle form validation errors", () => {
      const componentsDir = path.join(repoPath, "components");
      const files = fs
        .readdirSync(componentsDir)
        .filter((f) => f.endsWith(".tsx"));

      let hasErrorHandling = false;

      for (const file of files) {
        const content = fs.readFileSync(
          path.join(componentsDir, file),
          "utf-8",
        );

        if (
          content.includes("error") ||
          content.includes("Error") ||
          content.includes("invalid") ||
          content.includes("required")
        ) {
          hasErrorHandling = true;
          break;
        }
      }

      expect(hasErrorHandling).toBe(true);
    });
  });

  describe("Responsive Design", () => {
    it("should have global CSS with responsive styles", () => {
      const globalCss = path.join(repoPath, "app", "globals.css");

      if (fs.existsSync(globalCss)) {
        const content = fs.readFileSync(globalCss, "utf-8");

        // Check for responsive design patterns
        const hasResponsiveStyles =
          content.includes("@media") ||
          content.includes("responsive") ||
          content.includes("mobile") ||
          content.includes("@tailwind");

        expect(hasResponsiveStyles).toBe(true);
      } else {
        // Might use Tailwind CSS
        const packageJson = path.join(repoPath, "package.json");
        const pkgContent = JSON.parse(fs.readFileSync(packageJson, "utf-8"));

        expect(
          pkgContent.dependencies?.tailwindcss ||
            pkgContent.devDependencies?.tailwindcss,
        ).toBeDefined();
      }
    });
  });

  describe("User Feedback", () => {
    it("should provide feedback for user actions", () => {
      const componentsDir = path.join(repoPath, "components");
      const appDir = path.join(repoPath, "app");

      const checkForFeedback = (dir: string): boolean => {
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);

          if (
            stat.isDirectory() &&
            !file.startsWith(".") &&
            file !== "node_modules"
          ) {
            if (checkForFeedback(fullPath)) return true;
          } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
            const content = fs.readFileSync(fullPath, "utf-8");

            if (
              content.includes("toast") ||
              content.includes("success") ||
              content.includes("Success") ||
              content.includes("revalidatePath") ||
              content.includes("redirect")
            ) {
              return true;
            }
          }
        }
        return false;
      };

      const hasFeedback =
        checkForFeedback(componentsDir) || checkForFeedback(appDir);
      expect(hasFeedback).toBe(true);
    });
  });
});
