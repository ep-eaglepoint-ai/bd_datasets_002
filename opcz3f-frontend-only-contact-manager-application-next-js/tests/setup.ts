import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

// RequestAnimationFrame polyfill for React 18+ environment
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);

// TextEncoder polyfill
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

// ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!global.structuredClone) {
    global.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}

import { closeDB } from '../repository_after/contact-manager/src/lib/db';

const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = args.map(a => {
      if (a instanceof Error) return a.message;
      if (typeof a === 'object' && a !== null) {
          if ('message' in a) return (a as any).message; // Duck typing error
          return JSON.stringify(a);
      }
      return String(a);
  }).join(' ');

  if (
      msg.includes('Not implemented: navigation') || 
      msg.includes('Error: Not implemented: navigation')
  ) {
    return;
  }
  
  originalConsoleError(...args);
};

afterAll(async () => {
    await closeDB();
});

afterAll(async () => {
    await closeDB();
});
