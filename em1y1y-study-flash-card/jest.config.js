const path = require('path');

module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],

  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/repository_after/tsconfig.json',
      },
    ],
  },

  moduleNameMapper: {
    // Path aliases
    '^@/(.*)$': '<rootDir>/repository_after/src/$1'
  },
};
