import knex, { Knex } from 'knex';
import mockDb from 'mock-knex';
import { KnexInventoryService } from '../repository_after/KnexInventoryService';

describe('Test 4: Subquery Conversion for total_sold', () => {
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

    it('should create a subquery that sums quantities from order_items', () => {
        const subquery = (mockKnex('order_items as oi').sum('oi.quantity') as any).whereColumn('oi.product_id', 'p.id');
        const sql = subquery.toSQL().sql.toLowerCase();
        expect(sql).toContain('sum');
        expect(sql).toContain('quantity');
        expect(sql).toContain('order_items');
    });

    it('should correlate subquery to parent product using product_id', () => {
        const subquery = (mockKnex('order_items as oi').sum('oi.quantity') as any).whereColumn('oi.product_id', 'p.id');
        const sql = subquery.toSQL().sql;
        expect(sql).toMatch(/product_id/);
        expect(sql).toMatch(/p"?\."?id/);
    });

    it('should use COALESCE to handle null values', async () => {
        let capturedSql = '';
        tracker.on('query', (query) => {
            capturedSql = query.sql.toLowerCase();
            query.response([]);
        });

        await service.getInventoryReport({});
        expect(capturedSql).toContain('coalesce');
    });

    it('should alias the subquery result as totalSold', async () => {
        let capturedSql = '';
        tracker.on('query', (query) => {
            capturedSql = query.sql;
            query.response([]);
        });

        await service.getInventoryReport({});
        expect(capturedSql).toContain('totalSold');
    });
});
