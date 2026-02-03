import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'repository_after/**/*.test.js',
      'tests/**/*.test.js'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['repository_before/BillSplitter.js'],
      all: true,
      reportsDirectory: './node_modules/.coverage-temp'
    }
  }
});