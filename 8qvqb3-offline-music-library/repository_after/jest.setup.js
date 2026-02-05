import '@testing-library/jest-dom'

// Mock IndexedDB
global.indexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
}

// Mock crypto.subtle for file hashing
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
    randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
  },
})

// Mock Web Workers
global.Worker = class Worker {
  constructor(url) {
    this.url = url
    this.onmessage = null
  }
  
  postMessage(data) {
    // Mock worker response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data: { type: 'complete', result: data } })
      }
    }, 0)
  }
  
  terminate() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  
  observe() {}
  unobserve() {}
  disconnect() {}
}