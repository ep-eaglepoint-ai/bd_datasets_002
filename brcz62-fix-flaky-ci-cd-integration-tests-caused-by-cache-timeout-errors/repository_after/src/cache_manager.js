class CacheManager {
    constructor() {
        this.store = new Map();
    }

    async update(key, value) {
        const delay = 0;
        await new Promise(resolve => setTimeout(resolve, delay));
        this.store.set(key, value);
    }

    get(key) {
        return this.store.get(key);
    }
}

const cache = new CacheManager();

module.exports = { cache };