class CacheManager {
    constructor() {
        this.store = new Map();
    }

    async update(key, value) {
        // Deterministic async behavior without arbitrary delays
        this.store.set(key, value);
    }

    get(key) {
        return this.store.get(key);
    }
}

const cache = new CacheManager();

module.exports = { cache };