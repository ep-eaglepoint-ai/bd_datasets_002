module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    displayName: 'after',
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    testMatch: ['**/tests/**/*.test.ts'],
    moduleNameMapper: {
        // Tests import from @sut/languageDetection; default = repository_after (ground truth)
        '^@sut/(.*)$': '<rootDir>/repository_after/$1',
    },
    collectCoverageFrom: [
        'repository_after/languageDetection.ts',
        '!**/*.test.ts',
        '!**/node_modules/**',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
};
