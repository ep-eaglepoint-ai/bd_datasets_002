/**
 * Mock database client for persistence simulation
 */
const db = {
  async save(collection, record) {
    return { ...record, _id: `mock_${Date.now()}` };
  },

  async find(collection, query) {
    return null;
  },

  async update(collection, query, update) {
    return { modifiedCount: 1 };
  }
};

module.exports = db;
