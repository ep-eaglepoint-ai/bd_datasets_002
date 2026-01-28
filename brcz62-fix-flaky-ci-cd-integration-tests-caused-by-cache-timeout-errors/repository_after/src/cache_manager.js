const EventEmitter = require('events');

class CacheManager extends EventEmitter {
    constructor() {
        super();
        this.store = new Map();
    }

    // Asynchronous cache update
    async update(key, value) {
        // Schedule async update without arbitrary delay
        setImmediate(() => {
            this.store.set(key, value);
            this.emit('updated', key); // Notify listeners
        });
    }

    // Get value from cache
    get(key) {
        return this.store.get(key);
    }

    /**
     * Wait for a key to be updated asynchronously
     * @param {string} key - The cache key to wait for
     * @param {number} timeout - Timeout in milliseconds (default 5000ms)
     * @returns {Promise<any>} Resolves with value when updated, rejects if timeout
     */
    waitForKey(key, timeout = 5000) {
        return new Promise((resolve, reject) => {
            // If key already exists, resolve immediately
            if (this.store.has(key)) return resolve(this.store.get(key));

            // Timeout handling
            const timer = setTimeout(() => {
                this.removeListener('updated', listener);
                reject(new Error(`Timeout waiting for key "${key}"`));
            }, timeout);

            // Event listener for key update
            const listener = (updatedKey) => {
                if (updatedKey === key) {
                    clearTimeout(timer);
                    this.removeListener('updated', listener);
                    resolve(this.get(key));
                }
            };

            this.on('updated', listener);
        });
    }
}

// Export a singleton cache instance
const cache = new CacheManager();
module.exports = { cache };