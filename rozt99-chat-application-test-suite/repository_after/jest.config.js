/** @type {import('jest').Config} */
module.exports = {
  roots: ['<rootDir>/../tests'],
  moduleDirectories: ['node_modules'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/../tests/setupTests.js'],
};
