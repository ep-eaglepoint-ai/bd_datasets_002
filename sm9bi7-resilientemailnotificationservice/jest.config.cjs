/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  collectCoverageFrom: [
    'repository_before/**/*.ts',
    'repository_after/**/*.ts',
  ],
  coverageDirectory: 'coverage',
  testTimeout: 60000,
  verbose: true,
  forceExit: true,
};
