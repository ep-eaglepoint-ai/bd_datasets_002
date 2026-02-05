module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/backend/**/*.test.js'],
  collectCoverageFrom: [
    'repository_after/server/src/**/*.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 10000
};
