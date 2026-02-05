/**
 * Performance Optimizations Tests
 * 
 * Tests for the utilities that help achieve Requirement 1:
 * 50 sparklines at 10Hz without dropping below 60fps
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  rafThrottle, 
  debounce, 
  throttle, 
  createBatchUpdater,
  RingBuffer,
  PerformanceMonitor 
} from '../../repository_after/client/src/utils/performanceOptimizations.js';

describe('Performance Optimizations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rafThrottle', () => {
    test('should throttle calls to animation frame', () => {
      // Mock requestAnimationFrame
      let rafCallback = null;
      vi.stubGlobal('requestAnimationFrame', (cb) => {
        rafCallback = cb;
        return 1;
      });
      vi.stubGlobal('cancelAnimationFrame', vi.fn());

      const fn = vi.fn();
      const throttled = rafThrottle(fn);

      // Multiple calls
      throttled(1);
      throttled(2);
      throttled(3);

      // Not called yet
      expect(fn).not.toHaveBeenCalled();

      // Simulate animation frame
      if (rafCallback) rafCallback();

      // Called once with last args
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(3);
    });

    test('should be cancelable', () => {
      const cancelFn = vi.fn();
      vi.stubGlobal('requestAnimationFrame', () => 1);
      vi.stubGlobal('cancelAnimationFrame', cancelFn);

      const throttled = rafThrottle(vi.fn());
      throttled();
      throttled.cancel();

      expect(cancelFn).toHaveBeenCalled();
    });
  });

  describe('debounce', () => {
    test('should delay execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should reset timer on repeated calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should pass latest arguments', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('a');
      debounced('b');
      debounced('c');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('c');
    });

    test('should be cancelable', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.cancel();
      vi.advanceTimersByTime(100);

      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('throttle', () => {
    test('should limit call rate', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2); // Trailing call
    });

    test('should guarantee trailing call', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');
      throttled('last');

      vi.advanceTimersByTime(100);
      // Should have been called at least twice (first + trailing)
      expect(fn).toHaveBeenCalled();
      expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('createBatchUpdater', () => {
    test('should batch updates', () => {
      let rafCallback = null;
      vi.stubGlobal('requestAnimationFrame', (cb) => {
        rafCallback = cb;
        return 1;
      });
      vi.stubGlobal('cancelAnimationFrame', vi.fn());

      const processor = vi.fn();
      const batcher = createBatchUpdater(processor, 10);

      batcher.add({ id: 1 });
      batcher.add({ id: 2 });
      batcher.add({ id: 3 });

      expect(processor).not.toHaveBeenCalled();

      // Simulate animation frame
      if (rafCallback) rafCallback();

      expect(processor).toHaveBeenCalledWith([
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ]);
    });

    test('should flush when max batch size reached', () => {
      vi.stubGlobal('requestAnimationFrame', () => 1);

      const processor = vi.fn();
      const batcher = createBatchUpdater(processor, 3);

      batcher.add({ id: 1 });
      batcher.add({ id: 2 });
      expect(processor).not.toHaveBeenCalled();

      batcher.add({ id: 3 });
      expect(processor).toHaveBeenCalled();
    });

    test('should report batch size', () => {
      vi.stubGlobal('requestAnimationFrame', () => 1);

      const batcher = createBatchUpdater(vi.fn(), 100);

      batcher.add({ id: 1 });
      batcher.add({ id: 2 });

      expect(batcher.getSize()).toBe(2);
    });
  });

  describe('RingBuffer', () => {
    test('should store items up to capacity', () => {
      const buffer = new RingBuffer(3);

      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.toArray()).toEqual([1, 2, 3]);
      expect(buffer.isFull()).toBe(true);
    });

    test('should overwrite oldest when full', () => {
      const buffer = new RingBuffer(3);

      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);

      expect(buffer.toArray()).toEqual([3, 4, 5]);
    });

    test('should return latest item', () => {
      const buffer = new RingBuffer(5);

      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.getLatest()).toBe(3);
    });

    test('should handle empty buffer', () => {
      const buffer = new RingBuffer(5);

      expect(buffer.toArray()).toEqual([]);
      expect(buffer.getLatest()).toBeNull();
      expect(buffer.isFull()).toBe(false);
    });

    test('should clear buffer', () => {
      const buffer = new RingBuffer(5);

      buffer.push(1);
      buffer.push(2);
      buffer.clear();

      expect(buffer.toArray()).toEqual([]);
    });
  });
});
