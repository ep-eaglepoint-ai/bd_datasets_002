import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@repository': path.resolve(__dirname, process.env.REPO_PATH || 'repository_after')
        }
    },
    test: {
        globals: true,
    }
});
