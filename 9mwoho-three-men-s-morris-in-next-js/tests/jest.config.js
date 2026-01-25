const path = require('path');

// Get target repository from environment variable (default to repository_after)
const targetRepo = process.env.TARGET_REPO || 'repository_after';
const repoPath = path.resolve(__dirname, '..', targetRepo, 'three-mens-morris');

// Root node_modules path (for npm workspaces - dependencies are hoisted to root)
const rootNodeModules = path.resolve(__dirname, '..', 'node_modules');

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        module: 'commonjs',
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        moduleResolution: 'node',
      },
    }],
  },
  moduleNameMapper: {
    // Force Jest to use react from root node_modules (npm workspaces hoists dependencies)
    '^react$': path.resolve(rootNodeModules, 'react'),
    '^react/jsx-runtime$': path.resolve(rootNodeModules, 'react/jsx-runtime'),
    '^react/jsx-dev-runtime$': path.resolve(rootNodeModules, 'react/jsx-dev-runtime'),
    '^react-dom$': path.resolve(rootNodeModules, 'react-dom'),
    '^react-dom/test-utils$': path.resolve(rootNodeModules, 'react-dom/test-utils'),
    // Map @/* imports to the target repository's src folder
    '^@/(.*)$': `${repoPath}/src/$1`,
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  verbose: true,
};

module.exports = config;
