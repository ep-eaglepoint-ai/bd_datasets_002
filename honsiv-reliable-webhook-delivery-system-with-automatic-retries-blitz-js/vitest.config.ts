import { defineConfig } from "vitest/config"
import path from "path"

const repoPath = path.resolve(__dirname, "repository_after")

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 10000,
    teardownTimeout: 10000,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Run tests sequentially to avoid database interference
    threads: false,
    isolate: true,
  },
  resolve: {
    alias: {
      "@": path.join(repoPath, "src"),
      "db": path.join(repoPath, "db"),
      // Resolve dependencies from repository_after's node_modules
      "blitz": path.resolve(__dirname, "node_modules/blitz"),
      "@prisma/client": path.resolve(__dirname, "node_modules/@prisma/client"),
      "bullmq": path.resolve(__dirname, "node_modules/bullmq"),
      "ioredis": path.resolve(__dirname, "node_modules/ioredis"),
    },
    preserveSymlinks: true,
  },
  // Allow accessing files in repository_after
  server: {
    fs: {
      allow: [repoPath, __dirname],
    },
  },
  // Use repository_after's node_modules for resolution
  optimizeDeps: {
    include: ["blitz", "@prisma/client"],
  },
})
