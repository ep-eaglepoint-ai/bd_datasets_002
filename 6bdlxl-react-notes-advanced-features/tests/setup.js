// Jest setup file for React Testing Library
import "@testing-library/jest-dom";

// Mock window.confirm
global.confirm = jest.fn(() => true);

// Mock window.alert
global.alert = jest.fn();

// Mock URL.createObjectURL and revokeObjectURL for file downloads
global.URL.createObjectURL = jest.fn(() => "mock-url");
global.URL.revokeObjectURL = jest.fn();

// Mock Blob
global.Blob = jest.fn(function(content, options) {
  this.content = content;
  this.options = options;
});

// Mock FileReader
global.FileReader = class FileReader {
  readAsText(blob) {
    // Simulate async file reading
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: blob.content[0] } });
      }
    }, 0);
  }
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
