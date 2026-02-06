import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

const resolveDir = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "~/": resolveDir("./repository_after/"),
      "@/": resolveDir("./repository_after/"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["./tests/**/*.spec.ts"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
