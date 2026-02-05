/**
 * SlidingWindowBuffer - In-memory buffer for sensor data with automatic eviction
 * 
 * Requirement 2: The backend must implement a sliding-window buffer in memory 
 * to support immediate 'last 10 minutes' queries without hitting the primary 
 * database for every request.
 * 
 * Requirement 6: Testing Requirement: Include a backend unit test verifying 
 * that the memory buffer correctly evicts the oldest data points when the 
 * window size is exceeded.
 */

class SlidingWindowBuffer {
  /**
   * @param {number} windowSizeMs - Window size in milliseconds (default 10 minutes)
   * @param {number} maxPointsPerSensor - Max data points per sensor (prevents memory bloat)
   */
  constructor(windowSizeMs = 10 * 60 * 1000, maxPointsPerSensor = 6000) {
    this.windowSizeMs = windowSizeMs;
    this.maxPointsPerSensor = maxPointsPerSensor;
    // Map of sensorId -> sorted array of { timestamp, value, type }
    this.buffers = new Map();
    // Track eviction stats for testing
    this.evictionCount = 0;
  }

  /**
   * Push a new data point for a sensor
   * @param {string} sensorId 
   * @param {object} data - { timestamp, value, type }
   */
  push(sensorId, data) {
    if (!this.buffers.has(sensorId)) {
      this.buffers.set(sensorId, []);
    }
    
    const buffer = this.buffers.get(sensorId);
    const point = {
      timestamp: data.timestamp || Date.now(),
      value: data.value,
      type: data.type || 'unknown'
    };
    
    // Insert in sorted order (most data comes in order, so check end first)
    if (buffer.length === 0 || buffer[buffer.length - 1].timestamp <= point.timestamp) {
      buffer.push(point);
    } else {
      // Binary search for insert position (rare case)
      const insertIdx = this._findInsertIndex(buffer, point.timestamp);
      buffer.splice(insertIdx, 0, point);
    }
    
    // Evict old data
    this._evictOldData(sensorId);
  }

  /**
   * Push multiple data points in batch (more efficient)
   * @param {string} sensorId 
   * @param {Array} dataPoints 
   */
  pushBatch(sensorId, dataPoints) {
    for (const data of dataPoints) {
      this.push(sensorId, data);
    }
  }

  /**
   * Get data points within a time range
   * @param {string} sensorId 
   * @param {number} startMs - Start timestamp (inclusive)
   * @param {number} endMs - End timestamp (inclusive)
   * @returns {Array}
   */
  getRange(sensorId, startMs, endMs) {
    const buffer = this.buffers.get(sensorId);
    if (!buffer || buffer.length === 0) {
      return [];
    }

    // Binary search for start index
    const startIdx = this._findStartIndex(buffer, startMs);
    if (startIdx === -1) {
      return [];
    }

    const result = [];
    for (let i = startIdx; i < buffer.length && buffer[i].timestamp <= endMs; i++) {
      result.push({ ...buffer[i] });
    }
    
    return result;
  }

  /**
   * Get the last N data points for a sensor
   * @param {string} sensorId 
   * @param {number} count 
   * @returns {Array}
   */
  getLastN(sensorId, count) {
    const buffer = this.buffers.get(sensorId);
    if (!buffer || buffer.length === 0) {
      return [];
    }
    
    const startIdx = Math.max(0, buffer.length - count);
    return buffer.slice(startIdx).map(p => ({ ...p }));
  }

  /**
   * Get all data for a sensor within the current window
   * @param {string} sensorId 
   * @returns {Array}
   */
  getCurrentWindow(sensorId) {
    const now = Date.now();
    return this.getRange(sensorId, now - this.windowSizeMs, now);
  }

  /**
   * Get the total number of data points across all sensors
   * @returns {number}
   */
  getTotalSize() {
    let total = 0;
    for (const buffer of this.buffers.values()) {
      total += buffer.length;
    }
    return total;
  }

  /**
   * Get the number of data points for a specific sensor
   * @param {string} sensorId 
   * @returns {number}
   */
  getSensorSize(sensorId) {
    const buffer = this.buffers.get(sensorId);
    return buffer ? buffer.length : 0;
  }

  /**
   * Get all sensor IDs in the buffer
   * @returns {Array<string>}
   */
  getSensorIds() {
    return Array.from(this.buffers.keys());
  }

  /**
   * Clear all data for a sensor
   * @param {string} sensorId 
   */
  clearSensor(sensorId) {
    this.buffers.delete(sensorId);
  }

  /**
   * Clear all data
   */
  clearAll() {
    this.buffers.clear();
    this.evictionCount = 0;
  }

  /**
   * Get eviction statistics
   * @returns {object}
   */
  getEvictionStats() {
    return {
      totalEvictions: this.evictionCount,
      currentSensors: this.buffers.size,
      totalPoints: this.getTotalSize()
    };
  }

  /**
   * Evict data points outside the window or exceeding max count
   * @private
   */
  _evictOldData(sensorId) {
    const buffer = this.buffers.get(sensorId);
    if (!buffer || buffer.length === 0) return;

    const cutoffTime = Date.now() - this.windowSizeMs;
    let evicted = 0;

    // Remove points older than window
    while (buffer.length > 0 && buffer[0].timestamp < cutoffTime) {
      buffer.shift();
      evicted++;
    }

    // Remove points exceeding max count (keep newest)
    while (buffer.length > this.maxPointsPerSensor) {
      buffer.shift();
      evicted++;
    }

    this.evictionCount += evicted;
  }

  /**
   * Force eviction check on all sensors (useful for cleanup)
   */
  evictAll() {
    for (const sensorId of this.buffers.keys()) {
      this._evictOldData(sensorId);
    }
  }

  /**
   * Binary search to find insert index
   * @private
   */
  _findInsertIndex(buffer, timestamp) {
    let low = 0;
    let high = buffer.length;
    
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (buffer[mid].timestamp < timestamp) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    
    return low;
  }

  /**
   * Binary search to find first index >= startMs
   * @private
   */
  _findStartIndex(buffer, startMs) {
    let low = 0;
    let high = buffer.length;
    
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (buffer[mid].timestamp < startMs) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    
    return low < buffer.length ? low : -1;
  }
}

module.exports = { SlidingWindowBuffer };
