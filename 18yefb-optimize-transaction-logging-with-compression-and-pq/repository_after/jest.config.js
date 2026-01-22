module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  roots: ['<rootDir>/tests', '<rootDir>/repository_after'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/'],
  verbose: false,
  silent: true,
  reporters: ['<rootDir>/tests/summary-reporter.js'],
  transform: {
    '^.+\\.tsx?$': ['<rootDir>/repository_after/node_modules/ts-jest', {
      tsconfig: '<rootDir>/repository_after/tsconfig.json',
      diagnostics: false
    }]
  },
  moduleNameMapper: {
    '^@controller$': '<rootDir>/repository_after/telecomTopUP.controller'
  }
};