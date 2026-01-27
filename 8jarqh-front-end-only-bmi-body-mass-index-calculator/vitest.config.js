import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/**/*.{test,spec}.ts'],
    globals: true,
    alias: {
      '@': path.resolve(__dirname, process.env.REPO_PATH || './repository_after', 'src'),
    },
  },
});