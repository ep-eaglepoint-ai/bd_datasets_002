export default {
  testEnvironment: "jsdom",
  testTimeout: 10000,
  transform: {},
  testMatch: ["<rootDir>/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/setup.js"],
};
