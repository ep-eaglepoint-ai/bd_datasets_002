/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: '<rootDir>/jest.globalSetup.js',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Resolve app dependencies from repository_after when tests import from repository_after/src
  moduleDirectories: ['node_modules', 'repository_after/node_modules'],
  rootDir: __dirname,
  testTimeout: 15000,
  verbose: true,
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          module: 'commonjs',
        },
      },
    ],
  },
};
