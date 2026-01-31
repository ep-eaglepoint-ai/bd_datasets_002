import '@testing-library/jest-dom'

// Mock all IDB interfaces
const mockIDBIndex = {
  name: 'test',
  objectStore: null,
  keyPath: null,
  multiEntry: false,
  unique: false,
  count: jest.fn(() => mockIDBRequest),
  get: jest.fn(() => mockIDBRequest),
  getAll: jest.fn(() => mockIDBRequest),
  getAllKeys: jest.fn(() => mockIDBRequest),
  getKey: jest.fn(() => mockIDBRequest),
  openCursor: jest.fn(() => mockIDBRequest),
  openKeyCursor: jest.fn(() => mockIDBRequest),
}

const mockIDBRequest = {
  result: null,
  error: null,
  source: null,
  transaction: null,
  readyState: 'done',
  onsuccess: null,
  onerror: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}

const mockIDBTransaction = {
  objectStore: jest.fn(() => mockIDBObjectStore),
  abort: jest.fn(),
  commit: jest.fn(),
  db: null,
  error: null,
  mode: 'readonly',
  objectStoreNames: [],
  oncomplete: null,
  onerror: null,
  onabort: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}

const mockIDBObjectStore = {
  add: jest.fn(() => mockIDBRequest),
  clear: jest.fn(() => mockIDBRequest),
  count: jest.fn(() => mockIDBRequest),
  delete: jest.fn(() => mockIDBRequest),
  get: jest.fn(() => mockIDBRequest),
  getAll: jest.fn(() => mockIDBRequest),
  getAllKeys: jest.fn(() => mockIDBRequest),
  getKey: jest.fn(() => mockIDBRequest),
  put: jest.fn(() => mockIDBRequest),
  openCursor: jest.fn(() => mockIDBRequest),
  openKeyCursor: jest.fn(() => mockIDBRequest),
  createIndex: jest.fn(() => mockIDBIndex),
  deleteIndex: jest.fn(),
  index: jest.fn(() => mockIDBIndex),
  autoIncrement: false,
  indexNames: [],
  keyPath: null,
  name: 'test',
  transaction: mockIDBTransaction,
}

const mockIDBDatabase = {
  close: jest.fn(),
  createObjectStore: jest.fn(() => mockIDBObjectStore),
  deleteObjectStore: jest.fn(),
  transaction: jest.fn(() => mockIDBTransaction),
  name: 'test',
  objectStoreNames: [],
  version: 1,
  onabort: null,
  onclose: null,
  onerror: null,
  onversionchange: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}

// Set up all IDB globals
global.IDBRequest = jest.fn(() => mockIDBRequest)
global.IDBTransaction = jest.fn(() => mockIDBTransaction)
global.IDBObjectStore = jest.fn(() => mockIDBObjectStore)
global.IDBDatabase = jest.fn(() => mockIDBDatabase)
global.IDBIndex = jest.fn(() => mockIDBIndex)
global.IDBKeyRange = {
  bound: jest.fn(),
  lowerBound: jest.fn(),
  upperBound: jest.fn(),
  only: jest.fn(),
}
global.IDBCursor = jest.fn()
global.IDBCursorWithValue = jest.fn()

global.indexedDB = {
  open: jest.fn(() => {
    const request = { ...mockIDBRequest }
    setTimeout(() => {
      request.result = mockIDBDatabase
      if (request.onsuccess) request.onsuccess({ target: request })
    }, 0)
    return request
  }),
  deleteDatabase: jest.fn(() => mockIDBRequest),
  databases: jest.fn(() => Promise.resolve([])),
  cmp: jest.fn(),
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