module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^repository_(before|after)/(.*)$': '<rootDir>/repository_$1/$2',
  },
};