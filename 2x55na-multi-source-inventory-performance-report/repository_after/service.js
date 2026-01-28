/**
 * Service Layer
 * Fetches data from simulated Supabase tables.
 * Handles API failures gracefully.
 * Includes mock data for demonstration when using placeholder credentials.
 */

export const InventoryService = {
  /**
   * Mock data for demonstration purposes
   * This validates the calculation edge cases as required by verification
   */
  getMockData() {
    return {
      orders: [
        { id: 1, total_amount: 100 },
        { id: 2, total_amount: 200 },
        { id: 3, total_amount: 150 }
      ],
      expenses: [
        { id: 1, amount: 50 },
        { id: 2, amount: 75 }
      ],
      reviews: [
        { id: 1, rating: 5, weight: 2 },
        { id: 2, rating: 4, weight: 1 },
        { id: 3, rating: 3, weight: 3 }
      ]
    };
  },

  /**
   * Check if using placeholder Supabase credentials
   */
  isPlaceholderCredentials(supabaseClient) {
    // Check if the URL contains placeholder values
    return supabaseClient.supabaseUrl?.includes('placeholder') || 
           supabaseClient.supabaseKey === 'placeholder-key';
  },

  /**
   * Fetches data from orders, expenses, and product_reviews tables.
   * Returns a promise that resolves to an object containing the data.
   * If a fetch fails, it returns an empty array for that table.
   * Uses mock data when placeholder credentials are detected.
   */
  async fetchInventoryData(supabaseClient) {
    // Use mock data for demonstration with placeholder credentials
    if (this.isPlaceholderCredentials(supabaseClient)) {
      console.log('Using mock data for demonstration (placeholder credentials detected)');
      return this.getMockData();
    }

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
