module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/repository_after/contact-manager/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/repository_after/contact-manager/tsconfig.json',
      isolatedModules: true
    }]
  },
  moduleDirectories: ['node_modules', '<rootDir>/repository_after/contact-manager/node_modules'],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|idb|lucide-react)/)'
  ]
};
