module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js", "**/*.test.jsx"],
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testTimeout: 30000,
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  collectCoverageFrom: [
    "repository_after/**/*.{js,jsx}",
    "!repository_after/src/index.js",
  ],
  transformIgnorePatterns: ["node_modules/(?!(@testing-library)/)"],
};
