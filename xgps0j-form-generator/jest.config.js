const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './repository_after',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/repository_after/jest.setup.js'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/repository_after/src/$1',
  },
  roots: ['<rootDir>/tests'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx'
  ],
  collectCoverageFrom: [
    'repository_after/src/**/*.{js,jsx,ts,tsx}',
    '!repository_after/src/**/*.d.ts',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(idb)/)',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/repository_after/node_modules'],
}

module.exports = createJestConfig(customJestConfig)