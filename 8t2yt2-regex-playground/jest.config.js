/* eslint-env node */
module.exports = {
  roots: ["<rootDir>/tests"],
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/tests/**/*.test.(ts|tsx)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleDirectories: ["node_modules", "<rootDir>/repository_after/src"],
  testPathIgnorePatterns: [
    "<rootDir>/repository_after/.next/",
    "<rootDir>/node_modules/",
    ".*\\.d\\.ts",
  ],
  preset: "ts-jest",
  globals: {
    "ts-jest": {
      tsconfig: "tests/tsconfig.json",
    },
  },
};
