module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  roots: ['<rootDir>/tests', '<rootDir>/repository_before'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/'],
  verbose: false,
  silent: true,
  reporters: ['<rootDir>/tests/summary-reporter.js'],
  transform: {
    '^.+\\.tsx?$': ['<rootDir>/repository_before/node_modules/ts-jest', {
      tsconfig: '<rootDir>/repository_before/tsconfig.json',
      diagnostics: false
    }]
  },
  moduleNameMapper: {
    '^@controller$': '<rootDir>/repository_before/telecomTopUP.controller'
  }
};