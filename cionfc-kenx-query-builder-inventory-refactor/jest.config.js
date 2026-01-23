module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverageFrom: [
        'repository_after/**/*.ts',
        '!repository_after/**/*.d.ts',
    ],
    coverageDirectory: 'coverage',
    verbose: true,
};
