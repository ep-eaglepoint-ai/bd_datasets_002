import { InventoryAnalytics } from '@repository/analytics';
import { InventoryService } from '@repository/service';


describe('InventoryAnalytics', () => {
    it('calculates metrics correctly', () => {
        const orders = [{ total_amount: 100 }, { total_amount: 50 }];
        const expenses = [{ amount: 40 }, { amount: 10 }];
        const reviews = [
            { rating: 5, weight: 1 },
            { rating: 3, weight: 1 }
        ];

        const metrics = InventoryAnalytics.calculateMetrics(orders, expenses, reviews);

        expect(metrics.totalRevenue).toBe(150);
        expect(metrics.operatingCosts).toBe(50);
        expect(metrics.netProfit).toBe(100);
        expect(metrics.weightedSentiment).toBe(4);
    });

    it('handles empty data', () => {
        const metrics = InventoryAnalytics.calculateMetrics([], [], []);
        expect(metrics.totalRevenue).toBe(0);
        expect(metrics.operatingCosts).toBe(0);
        expect(metrics.netProfit).toBe(0);
        expect(metrics.weightedSentiment).toBe(0);
    });

    it('handles weighted sentiment correctly', () => {
        const reviews = [
            { rating: 5, weight: 2 }, // 10
            { rating: 1, weight: 1 }  // 1
        ]; // Sum: 11, Total Weight: 3, Avg: 3.67

        const metrics = InventoryAnalytics.calculateMetrics([], [], reviews);
        expect(metrics.weightedSentiment).toBe(3.67);
    });
});

describe('InventoryService', () => {
    let mockSupabase;

    beforeEach(() => {
        mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn()
        };
    });

    it('fetches all data successfully', async () => {
        mockSupabase.select
            .mockResolvedValueOnce({ data: [{ id: 1 }], error: null }) // orders
            .mockResolvedValueOnce({ data: [{ id: 2 }], error: null }) // expenses
            .mockResolvedValueOnce({ data: [{ id: 3 }], error: null }); // reviews

        const result = await InventoryService.fetchInventoryData(mockSupabase);

        expect(result.orders).toHaveLength(1);
        expect(result.expenses).toHaveLength(1);
        expect(result.reviews).toHaveLength(1);
        expect(mockSupabase.from).toHaveBeenCalledWith('orders');
        expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
        expect(mockSupabase.from).toHaveBeenCalledWith('product_reviews');
    });

    it('handles partial failures (Resilience)', async () => {
        // Suppress console.error for this test as we expect an error log
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Mock failed expenses fetch
        const mockSupabase = {
            from: (table) => ({
                select: () => {
                    if (table === 'expenses') return Promise.resolve({ data: null, error: { message: 'Failed' } });
                    if (table === 'orders') return Promise.resolve({ data: [{ total_amount: 100 }], error: null });
                    if (table === 'product_reviews') return Promise.resolve({ data: [{ id: 3 }], error: null });
                    return Promise.resolve({ data: [], error: null });
                }
            })
        };

        const data = await InventoryService.fetchInventoryData(mockSupabase);

        expect(data.orders).toHaveLength(1);
        expect(data.expenses).toEqual([]); // Should return empty array on failure
        expect(data.reviews).toHaveLength(1);

        consoleSpy.mockRestore();
    });
});
