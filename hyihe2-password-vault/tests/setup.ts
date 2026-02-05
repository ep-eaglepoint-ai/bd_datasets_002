import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Mock Web Crypto API for Node.js environment if not available
if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
        value: {
            getRandomValues: (buffer: Uint8Array) => {
                return require('crypto').randomFillSync(buffer);
            },
            subtle: {
                encrypt: vi.fn(),
                decrypt: vi.fn(),
                deriveKey: vi.fn(),
                importKey: vi.fn(),
                generateKey: vi.fn(),
            }
        }
    });
} else if (!global.crypto.subtle) {
     // If crypto exists (in newer Node) but subtle might be missing or limited in jsdom
     Object.defineProperty(global.crypto, 'subtle', {
        value: {
            encrypt: vi.fn(),
            decrypt: vi.fn(),
            deriveKey: vi.fn(),
            importKey: vi.fn(),
            generateKey: vi.fn(),
        }
     });
}

// Mock TextEncoder/TextDecoder if missing
if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = require('util').TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
    global.TextDecoder = require('util').TextDecoder;
}
