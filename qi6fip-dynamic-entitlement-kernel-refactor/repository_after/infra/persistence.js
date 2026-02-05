// Mock database module for testing
export const db = {
    execute: async (query, params) => {
        throw new Error('Database not configured. Use mocks in tests.');
    }
};
