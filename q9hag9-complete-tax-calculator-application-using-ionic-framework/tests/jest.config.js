export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>'],
    testMatch: ['**/*.test.ts', '**/*.test.tsx'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    },
    setupFilesAfterEnv: ['<rootDir>/setup-tests.ts'],
    collectCoverageFrom: [
        '../repository_after/src/**/*.{ts,tsx}',
        '!../repository_after/src/**/*.d.ts',
        '!../repository_after/src/main.tsx',
    ],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: '../tsconfig.json'
        }]
    }
};
