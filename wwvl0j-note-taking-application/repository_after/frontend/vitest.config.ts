import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    environment: "jsdom",
    globals: true,
    deps: {
      inline: [/^(?!.*vitest).*$/],
    },
  },
  server: {
    fs: {
      allow: ["/app"],
    },
  },
});
