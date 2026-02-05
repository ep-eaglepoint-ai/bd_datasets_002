const repo = process.env.REPO || 'repository_after';

module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  roots: ['<rootDir>/tests', `<rootDir>/${repo}`],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/'],
  verbose: false,
  silent: true,
  reporters: ['<rootDir>/tests/summary-reporter.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: false
    }]
  },
  moduleNameMapper: {
    '^@api$': `<rootDir>/${repo}/telebirr_calls`
  }
};
