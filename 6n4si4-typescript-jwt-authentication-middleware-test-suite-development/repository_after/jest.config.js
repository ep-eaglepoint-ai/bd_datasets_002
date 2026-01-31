module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'token.ts',
    'middleware.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  clearMocks: true,
  testTimeout: 5000
};
