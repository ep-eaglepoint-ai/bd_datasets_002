const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // Add support for tests outside of rootDir
  roots: ["<rootDir>", "<rootDir>/../tests"],
  testMatch: [
    "<rootDir>/../tests/**/*.test.ts",
    "<rootDir>/../tests/**/*.test.tsx",
  ],
  transformIgnorePatterns: ["node_modules/(?!(idb)/)"],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
