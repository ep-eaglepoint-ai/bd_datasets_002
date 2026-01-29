const mockAdd = jest.fn().mockResolvedValue({ id: '1' });
const mockAddBulk = jest.fn().mockResolvedValue([{ id: '1' }]);
const mockGetWaitingCount = jest.fn().mockResolvedValue(0);
const mockGetActiveCount = jest.fn().mockResolvedValue(0);

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        add: mockAdd, addBulk: mockAddBulk,
        getWaitingCount: mockGetWaitingCount, getActiveCount: mockGetActiveCount,
        close: jest.fn().mockResolvedValue(undefined),
    })),
    Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn().mockResolvedValue(undefined) })),
}));

jest.mock('../repository_after/src/database', () => ({ insertEventsBatch: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../repository_after/src/metrics', () => ({ incrementProcessed: jest.fn(), incrementFailed: jest.fn() }));

import { addEventToQueue, addEventsToQueue, getQueueDepth, canAcceptJob, QueueOverloadedError } from '../repository_after/src/queue';

describe('queue', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetWaitingCount.mockResolvedValue(0);
        mockGetActiveCount.mockResolvedValue(0);
    });

    describe('addEventToQueue', () => {
        it('uses jobId equal to event_id', async () => {
            const event = { event_id: 'ev-123', device_id: 'd1', sensor_type: 'temp', value: 25, unit: 'C', timestamp: '2024-01-01T00:00:00Z' };
            await addEventToQueue(event);
            expect(mockAdd).toHaveBeenCalledWith('process-event', event, { jobId: 'ev-123' });
        });
        it('throws QueueOverloadedError when queue depth exceeds threshold', async () => {
            mockGetWaitingCount.mockResolvedValue(5000);
            mockGetActiveCount.mockResolvedValue(5001);
            const event = { event_id: 'ev-1', device_id: 'd1', sensor_type: 'temp', value: 25, unit: 'C', timestamp: '2024-01-01T00:00:00Z' };
            await expect(addEventToQueue(event)).rejects.toThrow(QueueOverloadedError);
            expect(mockAdd).not.toHaveBeenCalled();
        });
    });

    describe('addEventsToQueue', () => {
        it('uses addBulk with jobId per event for small batches', async () => {
            const events = [
                { event_id: 'e1', device_id: 'd1', sensor_type: 'temp', value: 25, unit: 'C', timestamp: '2024-01-01T00:00:00Z' },
                { event_id: 'e2', device_id: 'd1', sensor_type: 'temp', value: 26, unit: 'C', timestamp: '2024-01-01T00:00:01Z' },
            ];
            await addEventsToQueue(events);
            expect(mockAddBulk).toHaveBeenCalled();
            const jobs = mockAddBulk.mock.calls[0][0];
            expect(jobs).toHaveLength(2);
            expect(jobs[0]).toEqual({ name: 'process-event', data: events[0], opts: { jobId: 'e1' } });
            expect(jobs[1]).toEqual({ name: 'process-event', data: events[1], opts: { jobId: 'e2' } });
        });
        it('throws QueueOverloadedError when queue depth exceeds threshold', async () => {
            mockGetWaitingCount.mockResolvedValue(10000);
            mockGetActiveCount.mockResolvedValue(0);
            await expect(addEventsToQueue([{ event_id: 'e1', device_id: 'd1', sensor_type: 'temp', value: 25, unit: 'C', timestamp: '2024-01-01T00:00:00Z' }])).rejects.toThrow(QueueOverloadedError);
            expect(mockAddBulk).not.toHaveBeenCalled();
        });
    });

    describe('getQueueDepth', () => {
        it('returns waiting + active count', async () => {
            mockGetWaitingCount.mockResolvedValue(100);
            mockGetActiveCount.mockResolvedValue(5);
            expect(await getQueueDepth()).toBe(105);
        });
    });

    describe('canAcceptJob', () => {
        it('returns true when depth below threshold', async () => {
            mockGetWaitingCount.mockResolvedValue(100);
            mockGetActiveCount.mockResolvedValue(0);
            expect(await canAcceptJob()).toBe(true);
        });
        it('returns false when depth at or above threshold', async () => {
            mockGetWaitingCount.mockResolvedValue(10000);
            mockGetActiveCount.mockResolvedValue(0);
            expect(await canAcceptJob()).toBe(false);
        });
    });
});
