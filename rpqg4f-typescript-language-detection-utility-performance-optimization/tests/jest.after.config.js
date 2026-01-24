export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@impl/languageDetection$': '<rootDir>/repository_after/src/languageDetection.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          esModuleInterop: true,
          module: 'ESNext',
          moduleResolution: 'node',
          target: 'ES2020',
          paths: {
            '@impl/languageDetection': ['./repository_after/src/languageDetection.ts']
          },
          baseUrl: '.'
        },
      },
    ],
  },
  rootDir: '..',
  testMatch: ['<rootDir>/tests/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
