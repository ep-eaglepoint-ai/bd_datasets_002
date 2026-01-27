// Jest setup file
import '@testing-library/jest-dom'

// Mock IndexedDB
import 'fake-indexeddb/auto'

// Polyfill structuredClone for Node.js environments that don't have it
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock File.text() method
if (typeof File !== 'undefined') {
  File.prototype.text = File.prototype.text || function(this: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(this)
    })
  }
}

// Polyfill Blob.text() for Node.js/Jest environments
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = function(this: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read blob'))
      reader.readAsText(this)
    })
  }
}
