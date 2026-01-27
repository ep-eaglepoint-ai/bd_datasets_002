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
