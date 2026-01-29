const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
const mockEnd = jest.fn().mockResolvedValue(undefined);

jest.mock('pg', () => ({
    Pool: jest.fn().mockImplementation(() => ({
        query: mockQuery,
        connect: jest.fn(),
        end: mockEnd,
    })),
    Client: jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        query: mockQuery,
        end: jest.fn().mockResolvedValue(undefined),
    })),
}));

jest.mock('../repository_after/src/circuitBreaker', () => ({
    getCircuitBreaker: () => ({ execute: (fn: () => unknown) => fn(), isOpen: () => false }),
}));

import { insertEventsBatch, insertEvent, getEventStats, isDatabaseHealthy, closePool } from '../repository_after/src/database';

describe('database', () => {
    beforeEach(() => {
        mockQuery.mockClear();
        mockEnd.mockClear();
        mockQuery.mockResolvedValue({ rows: [] });
    });

    describe('insertEventsBatch', () => {
        it('builds INSERT with ON CONFLICT (event_id) DO NOTHING', async () => {
            const events = [{
                event_id: 'e1', device_id: 'd1', sensor_type: 'temp', value: 25, unit: 'C',
                timestamp: '2024-01-01T00:00:00Z', processed_at: new Date(), received_at: new Date(),
            }];
            await insertEventsBatch(events);
            expect(mockQuery).toHaveBeenCalled();
            expect(mockQuery.mock.calls[0][0]).toContain('ON CONFLICT (event_id) DO NOTHING');
        });
        it('splits batches larger than 1000 into chunks', async () => {
            const events = Array.from({ length: 2500 }, (_, i) => ({
                event_id: 'e' + i, device_id: 'd', sensor_type: 'temp', value: i, unit: 'C',
                timestamp: '2024-01-01T00:00:00Z', processed_at: new Date(), received_at: new Date(),
            }));
            await insertEventsBatch(events);
            expect(mockQuery).toHaveBeenCalledTimes(3);
        });
    });

    describe('insertEvent', () => {
        it('calls insert with ON CONFLICT', async () => {
            const event = {
                event_id: 'e1', device_id: 'd1', sensor_type: 'temp', value: 25, unit: 'C',
                timestamp: '2024-01-01T00:00:00Z', processed_at: new Date(), received_at: new Date(),
            };
            await insertEvent(event);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT (event_id) DO NOTHING'), expect.any(Array));
        });
    });

    describe('getEventStats', () => {
        it('returns total from COUNT query', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ total: '42' }] });
            expect(await getEventStats()).toEqual({ total: 42 });
        });
    });

    describe('isDatabaseHealthy', () => {
        it('returns true when SELECT 1 succeeds', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            expect(await isDatabaseHealthy()).toBe(true);
        });
        it('returns false when query throws', async () => {
            mockQuery.mockRejectedValueOnce(new Error('connection refused'));
            expect(await isDatabaseHealthy()).toBe(false);
        });
    });

    describe('closePool', () => {
        it('calls pool.end()', async () => {
            await closePool();
            expect(mockEnd).toHaveBeenCalled();
        });
    });
});
