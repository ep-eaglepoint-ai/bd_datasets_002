module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.spec.js"],
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  moduleNameMapper: {
  "^@src/(.*)$": "<rootDir>/src/$1",
  "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.js"
},
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  moduleFileExtensions: ["js", "jsx"],
};
