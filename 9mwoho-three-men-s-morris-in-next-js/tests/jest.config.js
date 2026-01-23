const path = require('path');

// Get target repository from environment variable (default to repository_after)
const targetRepo = process.env.TARGET_REPO || 'repository_after';
const repoPath = path.resolve(__dirname, '..', targetRepo, 'three-mens-morris');

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
    // Force Jest to use the local react and react-dom to avoid duplicate React issues
    '^react$': path.resolve(__dirname, 'node_modules/react'),
    '^react/jsx-runtime$': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
    '^react/jsx-dev-runtime$': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
    '^react-dom$': path.resolve(__dirname, 'node_modules/react-dom'),
    '^react-dom/test-utils$': path.resolve(__dirname, 'node_modules/react-dom/test-utils'),
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
