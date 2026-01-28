/**
 * Performance Optimization Utilities
 * 
 * Requirement 1: The Vue.js frontend must render 50 concurrent sparklines 
 * updating at 10Hz without dropping below 60fps.
 * 
 * Strategies:
 * 1. requestAnimationFrame-based throttling to batch updates to next frame
 * 2. Debouncing for non-critical updates
 * 3. Batch state updates to minimize reactivity triggers
 */

/**
 * RAF-based throttle - ensures function runs at most once per animation frame
 * This prevents overwhelming the main thread with high-frequency updates
 * 
 * @param {Function} fn - Function to throttle
 * @returns {Function} Throttled function
 */
export function rafThrottle(fn) {
  let rafId = null;
  let lastArgs = null;

  const throttled = (...args) => {
    lastArgs = args;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        fn(...lastArgs);
        rafId = null;
      });
    }
  };

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return throttled;
}

/**
 * Traditional debounce - delays execution until after delay ms
 * 
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay) {
  let timeoutId = null;

  const debounced = (...args) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  debounced.flush = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      fn();
    }
  };

  return debounced;
}

/**
 * Throttle with guaranteed final call
 * 
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Minimum time between calls in ms
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit) {
  let lastCall = 0;
  let timeoutId = null;

  return (...args) => {
    const now = Date.now();
    const remaining = limit - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };
}

/**
 * Batch updates collector - collects updates and processes them together
 * 
 * @param {Function} processor - Function to process batched updates
 * @param {number} maxBatchSize - Max updates before forced flush
 * @returns {Object} { add, flush }
 */
export function createBatchUpdater(processor, maxBatchSize = 100) {
  let batch = [];
  let rafId = null;

  const flush = () => {
    if (batch.length > 0) {
      const toProcess = batch;
      batch = [];
      processor(toProcess);
    }
  };

  const scheduleFlush = () => {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        flush();
      });
    }
  };

  return {
    add: (update) => {
      batch.push(update);
      if (batch.length >= maxBatchSize) {
        flush();
      } else {
        scheduleFlush();
      }
    },
    flush,
    cancel: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      batch = [];
    },
    getSize: () => batch.length
  };
}

/**
 * Ring buffer for fixed-size data storage (efficient for sparklines)
 */
export class RingBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.size = 0;
  }

  push(item) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  toArray() {
    if (this.size === 0) return [];
    
    const result = new Array(this.size);
    const start = this.size < this.capacity ? 0 : this.head;
    
    for (let i = 0; i < this.size; i++) {
      result[i] = this.buffer[(start + i) % this.capacity];
    }
    
    return result;
  }

  getLatest() {
    if (this.size === 0) return null;
    const idx = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[idx];
  }

  clear() {
    this.head = 0;
    this.size = 0;
  }

  isFull() {
    return this.size === this.capacity;
  }
}

/**
 * Performance monitor for debugging
 */
export class PerformanceMonitor {
  constructor(sampleSize = 60) {
    this.frameTimes = new RingBuffer(sampleSize);
    this.lastFrameTime = 0;
    this.rafId = null;
  }

  start() {
    const measure = (timestamp) => {
      if (this.lastFrameTime > 0) {
        this.frameTimes.push(timestamp - this.lastFrameTime);
      }
      this.lastFrameTime = timestamp;
      this.rafId = requestAnimationFrame(measure);
    };
    this.rafId = requestAnimationFrame(measure);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getFPS() {
    const times = this.frameTimes.toArray();
    if (times.length === 0) return 0;
    
    const avgFrameTime = times.reduce((a, b) => a + b, 0) / times.length;
    return Math.round(1000 / avgFrameTime);
  }

  getStats() {
    const times = this.frameTimes.toArray();
    if (times.length === 0) {
      return { fps: 0, min: 0, max: 0, avg: 0 };
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return {
      fps: Math.round(1000 / avg),
      min: Math.round(1000 / max),
      max: Math.round(1000 / min),
      avg: Math.round(avg * 100) / 100
    };
  }
}
