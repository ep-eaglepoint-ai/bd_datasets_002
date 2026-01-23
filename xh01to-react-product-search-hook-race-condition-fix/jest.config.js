module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^repository_(before|after)/(.*)$': '<rootDir>/repository_$1/$2',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};