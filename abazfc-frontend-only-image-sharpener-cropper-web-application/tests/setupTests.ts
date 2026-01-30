import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Suppress React act() warnings and jsdom navigation warnings in tests
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('not wrapped in act')) return;
  if (args[0]?.includes?.('Not implemented: navigation')) return;
  originalError.apply(console, args);
};

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock ImageData
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
    if (typeof data === 'number') {
      this.width = data;
      this.height = widthOrHeight || data;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = data;
      this.width = widthOrHeight || 10;
      this.height = height || 10;
    }
  }
}

global.ImageData = MockImageData as any;

// Mock canvas context
const mockContext = {
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(400),
    width: 10,
    height: 10,
  })),
  putImageData: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  canvas: { width: 100, height: 100 },
};

HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as any;

HTMLCanvasElement.prototype.toBlob = vi.fn(function(
  this: HTMLCanvasElement,
  callback: BlobCallback,
  type?: string
) {
  callback(new Blob(['mock-image'], { type: type || 'image/png' }));
});

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');

// Mock Image loading
Object.defineProperty(global.Image.prototype, 'src', {
  set(src: string) {
    if (src) {
      setTimeout(() => {
        Object.defineProperty(this, 'naturalWidth', { value: 800, configurable: true });
        Object.defineProperty(this, 'naturalHeight', { value: 600, configurable: true });
        this.onload?.();
      }, 0);
    }
  },
});

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  value: 2,
  writable: true,
});

// Track fetch calls instead of throwing
const fetchCalls: any[] = [];
global.fetch = vi.fn((...args) => {
  fetchCalls.push(args);
  return Promise.reject(new Error('No backend'));
}) as any;
(global.fetch as any).getCalls = () => fetchCalls;
(global.fetch as any).clearCalls = () => { fetchCalls.length = 0; };
