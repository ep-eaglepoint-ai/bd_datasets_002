module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    displayName: 'before',
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    testMatch: ['**/tests/**/*.test.ts'],
    moduleNameMapper: {
        // Point @sut to repository_before so same tests run against buggy code
        '^@sut/(.*)$': '<rootDir>/repository_before/src/$1',
    },
    collectCoverageFrom: [],
    coverageThreshold: undefined,
};
