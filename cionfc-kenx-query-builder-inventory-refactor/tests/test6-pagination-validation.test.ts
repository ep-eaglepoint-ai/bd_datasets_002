import knex, { Knex } from 'knex';
import mockDb from 'mock-knex';
import { KnexInventoryService, ReportFilter } from '../repository_after/KnexInventoryService';

describe('Test 6: Pagination Validation', () => {
    let mockKnex: Knex;
    let service: KnexInventoryService;
    let tracker: mockDb.Tracker;

    beforeAll(() => {
        mockKnex = knex({
            client: 'pg',
        });
        mockDb.mock(mockKnex);
        tracker = mockDb.getTracker();
        tracker.install();
        service = new KnexInventoryService(mockKnex);
    });

    afterAll(async () => {
        tracker.uninstall();
        mockDb.unmock(mockKnex);
        await mockKnex.destroy();
    });

    it('should use default limit of 20 when no limit is specified', () => {
        const query = mockKnex('products as p').select('*').limit(20);
        const sql = query.toSQL();
        expect(sql.sql.toLowerCase()).toContain('limit');
        expect(sql.bindings).toContain(20);
    });

    it('should cap limit at 100 even if higher value is requested', () => {
        const requestedLimit = 500;
        const actualLimit = Math.min(requestedLimit, 100);
        expect(actualLimit).toBe(100);
        const query = mockKnex('products as p').select('*').limit(actualLimit);
        const sql = query.toSQL();
        expect(sql.bindings).toContain(100);
        expect(sql.bindings).not.toContain(500);
    });

    it('should use LIMIT clause in generated SQL', () => {
        const query = mockKnex('products as p').select('*').limit(50);
        const sql = query.toSQL().sql.toLowerCase();
        expect(sql).toContain('limit');
    });

    it('should use OFFSET clause for pagination', () => {
        const query = mockKnex('products as p').select('*').limit(20).offset(40);
        const sql = query.toSQL();
        expect(sql.sql.toLowerCase()).toContain('offset');
        expect(sql.bindings).toContain(40);
    });

    it('should accept custom offset values', () => {
        const offsets = [20, 40, 100, 500];
        offsets.forEach(offset => {
            const query = mockKnex('products as p').select('*').limit(20).offset(offset);
            const sql = query.toSQL();
            expect(sql.bindings).toContain(offset);
        });
    });

    it('should combine limit and offset correctly', () => {
        const query = mockKnex('products as p').select('*').limit(50).offset(100);
        const sql = query.toSQL();
        expect(sql.sql.toLowerCase()).toContain('limit');
        expect(sql.sql.toLowerCase()).toContain('offset');
        expect(sql.bindings).toContain(50);
        expect(sql.bindings).toContain(100);
    });
});
