import '@testing-library/jest-dom';

// Mock window.addEventListener and removeEventListener
global.window.addEventListener = jest.fn();
global.window.removeEventListener = jest.fn();

// Mock setTimeout and clearTimeout for animation tests
global.setTimeout = jest.fn((fn, delay) => {
  return setTimeout(fn, 0); // Execute immediately in tests
});
global.clearTimeout = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};