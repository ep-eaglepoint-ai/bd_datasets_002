// Mock cache module for testing
export const cache = {
    get: async (key) => {
        throw new Error('Cache not configured. Use mocks in tests.');
    },
    set: async (key, value, ttl) => {
        throw new Error('Cache not configured. Use mocks in tests.');
    }
};
