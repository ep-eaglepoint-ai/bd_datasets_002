import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '',
      push: vi.fn(),
      pop: vi.fn(),
      reload: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      beforePopState: vi.fn(),
      events: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      },
    };
  },
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url');
global.URL.revokeObjectURL = vi.fn();

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
});

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};

// Global test utilities
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeValidBookmark(): T;
      toBeValidBookmarkTag(): T;
      toBeValidBookmarkCollection(): T;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidBookmark(received) {
    const isValid = received && 
      typeof received === 'object' &&
      typeof received.id === 'string' &&
      typeof received.title === 'string' &&
      typeof received.url === 'string' &&
      Array.isArray(received.tags) &&
      typeof received.isFavorite === 'boolean' &&
      received.createdAt instanceof Date &&
      received.updatedAt instanceof Date;

    return {
      pass: isValid,
      message: () => `expected ${received} to be a valid bookmark`,
    };
  },

  toBeValidBookmarkTag(received) {
    const isValid = received && 
      typeof received === 'object' &&
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      typeof received.normalized === 'string' &&
      received.createdAt instanceof Date &&
      received.updatedAt instanceof Date;

    return {
      pass: isValid,
      message: () => `expected ${received} to be a valid bookmark tag`,
    };
  },

  toBeValidBookmarkCollection(received) {
    const isValid = received && 
      typeof received === 'object' &&
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      received.createdAt instanceof Date &&
      received.updatedAt instanceof Date;

    return {
      pass: isValid,
      message: () => `expected ${received} to be a valid bookmark collection`,
    };
  },
});
