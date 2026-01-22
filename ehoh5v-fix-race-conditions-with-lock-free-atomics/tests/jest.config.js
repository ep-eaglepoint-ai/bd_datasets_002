/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  transform: {},
  moduleFileExtensions: ["js", "mjs"],
  testMatch: ["**/before/**/*.test.js", "**/after/**/*.test.js"],
  verbose: true,
  testTimeout: 60000, // 60s timeout for race tests
  projects: [
    {
      displayName: "before",
      testMatch: ["<rootDir>/before/**/*.test.js"],
      testEnvironment: "node",
    },
    {
      displayName: "after",
      testMatch: ["<rootDir>/after/**/*.test.js"],
      testEnvironment: "node",
    },
  ],
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "./test-results",
        outputName: "junit.xml",
      },
    ],
  ],
};
