/**
 * RequestCoalescer - Prevents thundering herd problem for historical data requests
 * 
 * Requirement 4: The system must handle a 'thundering herd' scenario where 100 
 * clients refresh the page and request historical data simultaneously.
 * 
 * Strategy:
 * 1. Request deduplication: identical concurrent requests share a single computation
 * 2. Short-lived cache with TTL for recent queries
 * 3. Semaphore for limiting concurrent heavy operations
 */

class RequestCoalescer {
  /**
   * @param {object} options
   * @param {number} options.cacheTTLMs - Cache TTL in milliseconds (default 1000ms)
   * @param {number} options.maxConcurrent - Max concurrent heavy operations (default 10)
   */
  constructor(options = {}) {
    this.cacheTTLMs = options.cacheTTLMs || 1000;
    this.maxConcurrent = options.maxConcurrent || 10;
    
    // Cache of completed results: key -> { data, expiry }
    this.cache = new Map();
    
    // In-flight requests: key -> Promise
    this.inFlight = new Map();
    
    // Semaphore for limiting concurrent operations
    this.activeOperations = 0;
    this.waitingQueue = [];
    
    // Stats for monitoring
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      coalesced: 0,
      queued: 0
    };
  }

  /**
   * Generate a cache key from request parameters
   * @param {string} sensorId 
   * @param {number} startMs 
   * @param {number} endMs 
   * @returns {string}
   */
  generateKey(sensorId, startMs, endMs) {
    // Round to nearest second to improve cache hits
    const roundedStart = Math.floor(startMs / 1000) * 1000;
    const roundedEnd = Math.floor(endMs / 1000) * 1000;
    return `${sensorId}:${roundedStart}:${roundedEnd}`;
  }

  /**
   * Execute a request with coalescing and caching
   * @param {string} key - Unique request key
   * @param {Function} fetcher - Async function that fetches the data
   * @returns {Promise}
   */
  async execute(key, fetcher) {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      this.stats.cacheHits++;
      return cached.data;
    }
    
    // Check if request is already in-flight
    if (this.inFlight.has(key)) {
      this.stats.coalesced++;
      return this.inFlight.get(key);
    }
    
    this.stats.cacheMisses++;
    
    // Wait for semaphore if at capacity
    if (this.activeOperations >= this.maxConcurrent) {
      this.stats.queued++;
      await this._waitForSlot();
    }
    
    // Create the in-flight promise
    const promise = this._executeWithSemaphore(key, fetcher);
    this.inFlight.set(key, promise);
    
    try {
      const result = await promise;
      
      // Cache the result
      this.cache.set(key, {
        data: result,
        expiry: Date.now() + this.cacheTTLMs
      });
      
      return result;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /**
   * Execute fetcher with semaphore protection
   * @private
   */
  async _executeWithSemaphore(key, fetcher) {
    this.activeOperations++;
    
    try {
      return await fetcher();
    } finally {
      this.activeOperations--;
      this._releaseSlot();
    }
  }

  /**
   * Wait for a semaphore slot to become available
   * @private
   */
  _waitForSlot() {
    return new Promise(resolve => {
      this.waitingQueue.push(resolve);
    });
  }

  /**
   * Release a semaphore slot and wake up waiting requests
   * @private
   */
  _releaseSlot() {
    if (this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift();
      next();
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (value.expiry <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache and in-flight requests
   */
  clear() {
    this.cache.clear();
    // Note: in-flight requests will complete naturally
  }

  /**
   * Get current statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      inFlightRequests: this.inFlight.size,
      activeOperations: this.activeOperations,
      queuedRequests: this.waitingQueue.length,
      hitRate: this.stats.cacheHits / 
        (this.stats.cacheHits + this.stats.cacheMisses) || 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      coalesced: 0,
      queued: 0
    };
  }
}

module.exports = { RequestCoalescer };
