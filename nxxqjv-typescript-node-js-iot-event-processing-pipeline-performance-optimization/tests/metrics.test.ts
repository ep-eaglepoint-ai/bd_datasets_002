import {
    incrementReceived,
    incrementProcessed,
    incrementFailed,
    getTotalReceived,
    getTotalProcessed,
    getTotalFailed,
    getEventsPerSecond,
    getMemoryUsageMb,
    resetMetrics,
} from '../repository_after/src/metrics';

describe('metrics', () => {
    beforeEach(() => {
        resetMetrics();
    });

    it('increments and returns total_received', () => {
        expect(getTotalReceived()).toBe(0);
        incrementReceived(1);
        incrementReceived(5);
        expect(getTotalReceived()).toBe(6);
    });

    it('increments and returns total_processed', () => {
        expect(getTotalProcessed()).toBe(0);
        incrementProcessed(1);
        incrementProcessed(10);
        expect(getTotalProcessed()).toBe(11);
    });

    it('increments and returns total_failed', () => {
        expect(getTotalFailed()).toBe(0);
        incrementFailed(1);
        incrementFailed(2);
        expect(getTotalFailed()).toBe(3);
    });

    it('getEventsPerSecond returns number', () => {
        incrementProcessed(60);
        const rate = getEventsPerSecond();
        expect(typeof rate).toBe('number');
        expect(rate).toBeGreaterThanOrEqual(0);
    });

    it('getMemoryUsageMb returns positive number', () => {
        const mb = getMemoryUsageMb();
        expect(typeof mb).toBe('number');
        expect(mb).toBeGreaterThanOrEqual(0);
    });

    it('resetMetrics zeros counters', () => {
        incrementReceived(10);
        incrementProcessed(5);
        incrementFailed(1);
        resetMetrics();
        expect(getTotalReceived()).toBe(0);
        expect(getTotalProcessed()).toBe(0);
        expect(getTotalFailed()).toBe(0);
    });
});
