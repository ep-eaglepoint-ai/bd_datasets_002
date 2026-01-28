import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
    alias: {
      '@': path.resolve(__dirname, process.env.REPO_PATH || './repository_after', 'src'),
    },
  },
});