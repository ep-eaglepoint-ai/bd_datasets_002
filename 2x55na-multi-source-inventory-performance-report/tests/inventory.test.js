import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { InventoryAnalytics } from '../repository_after/analytics.js';
import { InventoryService } from '../repository_after/service.js';

describe('InventoryAnalytics', () => {
    it('calculates metrics correctly', () => {
        const orders = [{ total_amount: 100 }, { total_amount: 50 }];
        const expenses = [{ amount: 40 }, { amount: 10 }];
        const reviews = [
            { rating: 5, weight: 1 },
            { rating: 3, weight: 1 }
        ];

        const metrics = InventoryAnalytics.calculateMetrics(orders, expenses, reviews);

        assert.equal(metrics.totalRevenue, 150);
        assert.equal(metrics.operatingCosts, 50);
        assert.equal(metrics.netProfit, 100);
        assert.equal(metrics.weightedSentiment, 4);
    });

    it('handles empty data', () => {
        const metrics = InventoryAnalytics.calculateMetrics([], [], []);
        assert.equal(metrics.totalRevenue, 0);
        assert.equal(metrics.operatingCosts, 0);
        assert.equal(metrics.netProfit, 0);
        assert.equal(metrics.weightedSentiment, 0);
    });

    it('handles weighted sentiment correctly', () => {
        const reviews = [
            { rating: 5, weight: 2 }, // 10
            { rating: 1, weight: 1 }  // 1
        ]; // Sum: 11, Total Weight: 3, Avg: 3.67

        const metrics = InventoryAnalytics.calculateMetrics([], [], reviews);
        assert.equal(metrics.weightedSentiment, 3.67);
    });
});

describe('InventoryService', () => {
    let mockSupabase;

    beforeEach(() => {
        mockSupabase = {
            from: mock.fn(() => mockSupabase),
            select: mock.fn()
        };
    });

    it('fetches all data successfully', async () => {
        mockSupabase.select.mock.mockImplementationOnce(() => Promise.resolve({ data: [{ id: 1 }], error: null }), 0);
        mockSupabase.select.mock.mockImplementationOnce(() => Promise.resolve({ data: [{ id: 2 }], error: null }), 1);
        mockSupabase.select.mock.mockImplementationOnce(() => Promise.resolve({ data: [{ id: 3 }], error: null }), 2);

        // Helper to mimic simpler sequential mock if needed, but implementationOnce logic varies.
        // Node's mockImplementationOnce stacks.

        const result = await InventoryService.fetchInventoryData(mockSupabase);

        assert.equal(result.orders.length, 1);
        assert.equal(result.expenses.length, 1);
        assert.equal(result.reviews.length, 1);
        assert.equal(mockSupabase.from.mock.calls.length, 3);
        assert.equal(mockSupabase.from.mock.calls[0].arguments[0], 'orders');
        assert.equal(mockSupabase.from.mock.calls[1].arguments[0], 'expenses');
        assert.equal(mockSupabase.from.mock.calls[2].arguments[0], 'product_reviews');
    });

    it('handles partial failures (Resilience)', async () => {
        // Suppress console.error
        const consoleSpy = mock.method(console, 'error', () => { });

        mockSupabase.from = mock.fn((table) => ({
            select: () => {
                if (table === 'expenses') return Promise.resolve({ data: null, error: { message: 'Failed' } });
                if (table === 'orders') return Promise.resolve({ data: [{ total_amount: 100 }], error: null });
                if (table === 'product_reviews') return Promise.resolve({ data: [{ id: 3 }], error: null });
                return Promise.resolve({ data: [], error: null });
            }
        }));

        const data = await InventoryService.fetchInventoryData(mockSupabase);

        assert.equal(data.orders.length, 1);
        assert.deepEqual(data.expenses, []);
        assert.equal(data.reviews.length, 1);

        consoleSpy.mock.restore();
    });
});
