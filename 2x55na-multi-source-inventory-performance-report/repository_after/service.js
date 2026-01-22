/**
 * Service Layer
 * Fetches data from simulated Supabase tables.
 * Handles API failures gracefully.
 */

export const InventoryService = {
  /**
   * Fetches data from orders, expenses, and product_reviews tables.
   * Returns a promise that resolves to an object containing the data.
   * If a fetch fails, it returns an empty array for that table, unless it's critical?
   * Requirement 5 says: failed 'reviews' shouldn't hide 'orders'.
   * So we catch errors individually.
   */
  async fetchInventoryData(supabaseClient) {
    const fetchTable = async (table) => {
      try {
        const { data, error } = await supabaseClient.from(table).select('*');
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error(`Failed to fetch ${table}:`, err);
        return []; // Return empty array on failure to ensure resilience
      }
    };

    const [orders, expenses, reviews] = await Promise.all([
      fetchTable('orders'),
      fetchTable('expenses'),
      fetchTable('product_reviews')
    ]);

    return { orders, expenses, reviews };
  }
};
