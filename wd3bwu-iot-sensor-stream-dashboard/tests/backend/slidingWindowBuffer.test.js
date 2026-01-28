/**
 * Sliding Window Buffer Tests
 * 
 * Requirement 6: Testing Requirement: Include a backend unit test verifying 
 * that the memory buffer correctly evicts the oldest data points when the 
 * window size is exceeded.
 */

const { SlidingWindowBuffer } = require('../../repository_after/server/src/buffer/SlidingWindowBuffer');

describe('SlidingWindowBuffer', () => {
  let buffer;

  beforeEach(() => {
    // 1 second window for testing, max 10 points per sensor
    buffer = new SlidingWindowBuffer(1000, 10);
  });

  afterEach(() => {
    buffer.clearAll();
  });

  describe('Basic Operations', () => {
    test('should initialize with empty state', () => {
      expect(buffer.getTotalSize()).toBe(0);
      expect(buffer.getSensorIds()).toEqual([]);
    });

    test('should push and retrieve data points', () => {
      const timestamp = Date.now();
      buffer.push('sensor-001', { timestamp, value: 42, type: 'temperature' });
      
      expect(buffer.getSensorSize('sensor-001')).toBe(1);
      const data = buffer.getLastN('sensor-001', 1);
      expect(data).toHaveLength(1);
      expect(data[0].value).toBe(42);
    });

    test('should handle multiple sensors independently', () => {
      buffer.push('sensor-001', { value: 10, timestamp: Date.now() });
      buffer.push('sensor-002', { value: 20, timestamp: Date.now() });
      buffer.push('sensor-001', { value: 15, timestamp: Date.now() });
      
      expect(buffer.getSensorSize('sensor-001')).toBe(2);
      expect(buffer.getSensorSize('sensor-002')).toBe(1);
      expect(buffer.getSensorIds()).toEqual(['sensor-001', 'sensor-002']);
    });

    test('should return data in sorted order by timestamp', () => {
      const now = Date.now();
      buffer.push('sensor-001', { value: 1, timestamp: now + 100 });
      buffer.push('sensor-001', { value: 2, timestamp: now });
      buffer.push('sensor-001', { value: 3, timestamp: now + 50 });
      
      const data = buffer.getLastN('sensor-001', 3);
      expect(data.map(d => d.value)).toEqual([2, 3, 1]);
    });
  });

  describe('Range Queries', () => {
    test('should return data within time range', () => {
      const now = Date.now();
      buffer.push('sensor-001', { value: 1, timestamp: now - 500 });
      buffer.push('sensor-001', { value: 2, timestamp: now - 300 });
      buffer.push('sensor-001', { value: 3, timestamp: now - 100 });
      
      const data = buffer.getRange('sensor-001', now - 400, now - 200);
      expect(data).toHaveLength(1);
      expect(data[0].value).toBe(2);
    });

    test('should return empty array for non-existent sensor', () => {
      expect(buffer.getRange('non-existent', 0, Date.now())).toEqual([]);
    });

    test('should return empty array for range with no data', () => {
      buffer.push('sensor-001', { value: 1, timestamp: 1000 });
      expect(buffer.getRange('sensor-001', 2000, 3000)).toEqual([]);
    });
  });

  describe('Eviction - Requirement 6', () => {
    test('should evict data older than window size', async () => {
      // Use a very short window (100ms) for this test
      const shortBuffer = new SlidingWindowBuffer(100, 100);
      
      const oldTimestamp = Date.now() - 200; // 200ms ago (outside window)
      const newTimestamp = Date.now();
      
      shortBuffer.push('sensor-001', { value: 1, timestamp: oldTimestamp });
      shortBuffer.push('sensor-001', { value: 2, timestamp: newTimestamp });
      
      // The old point should be evicted
      expect(shortBuffer.getSensorSize('sensor-001')).toBe(1);
      
      const data = shortBuffer.getLastN('sensor-001', 10);
      expect(data).toHaveLength(1);
      expect(data[0].value).toBe(2);
      expect(shortBuffer.getEvictionStats().totalEvictions).toBeGreaterThan(0);
    });

    test('should evict oldest data when max points exceeded', () => {
      // Buffer with max 5 points per sensor
      const limitedBuffer = new SlidingWindowBuffer(60000, 5);
      const now = Date.now();
      
      // Push 7 points
      for (let i = 0; i < 7; i++) {
        limitedBuffer.push('sensor-001', { value: i, timestamp: now + i });
      }
      
      // Should only keep last 5
      expect(limitedBuffer.getSensorSize('sensor-001')).toBe(5);
      
      const data = limitedBuffer.getLastN('sensor-001', 10);
      expect(data.map(d => d.value)).toEqual([2, 3, 4, 5, 6]);
      expect(limitedBuffer.getEvictionStats().totalEvictions).toBe(2);
    });

    test('should correctly report eviction statistics', () => {
      const limitedBuffer = new SlidingWindowBuffer(60000, 3);
      const now = Date.now();
      
      // Push 10 points
      for (let i = 0; i < 10; i++) {
        limitedBuffer.push('sensor-001', { value: i, timestamp: now + i });
      }
      
      const stats = limitedBuffer.getEvictionStats();
      expect(stats.totalEvictions).toBe(7); // 10 - 3 = 7 evicted
      expect(stats.currentSensors).toBe(1);
      expect(stats.totalPoints).toBe(3);
    });

    test('should evict from multiple sensors independently', () => {
      const limitedBuffer = new SlidingWindowBuffer(60000, 2);
      const now = Date.now();
      
      // Push 3 points to each sensor
      for (let i = 0; i < 3; i++) {
        limitedBuffer.push('sensor-001', { value: i, timestamp: now + i });
        limitedBuffer.push('sensor-002', { value: i * 10, timestamp: now + i });
      }
      
      expect(limitedBuffer.getSensorSize('sensor-001')).toBe(2);
      expect(limitedBuffer.getSensorSize('sensor-002')).toBe(2);
      expect(limitedBuffer.getEvictionStats().totalEvictions).toBe(2); // 1 per sensor
    });

    test('should handle eviction with time window and max count together', async () => {
      // 100ms window, max 100 points
      const dualBuffer = new SlidingWindowBuffer(100, 100);
      
      // Add old data
      const oldTime = Date.now() - 200;
      for (let i = 0; i < 5; i++) {
        dualBuffer.push('sensor-001', { value: i, timestamp: oldTime + i });
      }
      
      // Add new data
      const newTime = Date.now();
      for (let i = 0; i < 3; i++) {
        dualBuffer.push('sensor-001', { value: i + 100, timestamp: newTime + i });
      }
      
      // Only new data should remain
      expect(dualBuffer.getSensorSize('sensor-001')).toBe(3);
      const data = dualBuffer.getLastN('sensor-001', 10);
      expect(data.every(d => d.value >= 100)).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    test('should handle batch push efficiently', () => {
      const dataPoints = [];
      const now = Date.now();
      
      for (let i = 0; i < 100; i++) {
        dataPoints.push({ value: i, timestamp: now + i });
      }
      
      const limitedBuffer = new SlidingWindowBuffer(60000, 50);
      limitedBuffer.pushBatch('sensor-001', dataPoints);
      
      expect(limitedBuffer.getSensorSize('sensor-001')).toBe(50);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty buffer queries gracefully', () => {
      expect(buffer.getRange('empty', 0, Date.now())).toEqual([]);
      expect(buffer.getLastN('empty', 10)).toEqual([]);
      expect(buffer.getCurrentWindow('empty')).toEqual([]);
    });

    test('should handle single data point', () => {
      const now = Date.now();
      buffer.push('sensor-001', { value: 42, timestamp: now });
      
      expect(buffer.getLastN('sensor-001', 1)).toHaveLength(1);
      expect(buffer.getRange('sensor-001', now, now)).toHaveLength(1);
    });

    test('should clear sensor data correctly', () => {
      buffer.push('sensor-001', { value: 1, timestamp: Date.now() });
      buffer.push('sensor-002', { value: 2, timestamp: Date.now() });
      
      buffer.clearSensor('sensor-001');
      
      expect(buffer.getSensorSize('sensor-001')).toBe(0);
      expect(buffer.getSensorSize('sensor-002')).toBe(1);
    });

    test('should clear all data correctly', () => {
      buffer.push('sensor-001', { value: 1, timestamp: Date.now() });
      buffer.push('sensor-002', { value: 2, timestamp: Date.now() });
      
      buffer.clearAll();
      
      expect(buffer.getTotalSize()).toBe(0);
      expect(buffer.getSensorIds()).toEqual([]);
    });
  });
});
