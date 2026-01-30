import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        'coverage/',
        'dist/',
        '.next/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './repository_after'),
      '@components': resolve(__dirname, './repository_after/components'),
      '@store': resolve(__dirname, './repository_after/store'),
      '@types': resolve(__dirname, './repository_after/types'),
      '@utils': resolve(__dirname, './repository_after/utils'),
    },
  },
});
