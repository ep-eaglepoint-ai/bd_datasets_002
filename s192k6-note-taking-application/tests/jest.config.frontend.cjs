module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/frontend/**/*.test.jsx"],
  testTimeout: 30000,
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/setupTests.cjs"],
  moduleNameMapper: {
    "^@/client/(.*)$": "/app/repository_after/client/$1",
    "^react$": "/app/repository_after/client/node_modules/react",
    "^react-dom$": "/app/repository_after/client/node_modules/react-dom",
  },
  moduleDirectories: ["node_modules", "/app/repository_after/client/node_modules"],
};
