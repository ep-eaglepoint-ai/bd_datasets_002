
const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
const mockEnd = jest.fn().mockResolvedValue(undefined);

jest.mock('pg', () => ({
    Client: jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        query: mockQuery,
        end: mockEnd,
    })),
}));

import { insertEvent, getEventStats } from '../../repository_before/database';

describe('database (repository_before)', () => {
    beforeEach(() => {
        mockQuery.mockClear();
        mockEnd.mockClear();
        mockQuery.mockResolvedValue({ rows: [] });
    });

    describe('insertEvent', () => {
        it('uses ON CONFLICT (event_id) DO NOTHING for idempotency', async () => {
            const event = {
                event_id: 'e1', device_id: 'd1', sensor_type: 'temp', value: 25, unit: 'C',
                timestamp: '2024-01-01T00:00:00Z', processed_at: new Date(), received_at: new Date(),
            };
            await insertEvent(event);
            expect(mockQuery).toHaveBeenCalled();
            const sql = mockQuery.mock.calls[0][0];
            expect(sql).toContain('ON CONFLICT (event_id) DO NOTHING');
        });
    });

    describe('getEventStats', () => {
        it('returns total from COUNT query', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ total: '42' }] });
            const result = await getEventStats();
            expect(result).toEqual({ total: 42 });
        });
    });
});
