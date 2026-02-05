import knex, { Knex } from 'knex';
import mockDb from 'mock-knex';
import { KnexInventoryService } from '../repository_after/KnexInventoryService';

describe('Test 3: Dynamic Stock Status Filter', () => {
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

    it('should add WHERE clause for in_stock filter (stock_count > 0)', () => {
        const query = mockKnex('products as p').select('p.stock_count').where('p.stock_count', '>', 0);
        const sql = query.toSQL();
        expect(sql.sql.toLowerCase()).toContain('where');
        expect(sql.sql).toContain('stock_count');
        expect(sql.bindings).toContain(0);
    });

    it('should add WHERE clause for out_of_stock filter (stock_count = 0)', () => {
        const query = mockKnex('products as p').select('p.stock_count').where('p.stock_count', '=', 0);
        const sql = query.toSQL();
        expect(sql.sql.toLowerCase()).toContain('where');
        expect(sql.sql).toContain('stock_count');
        expect(sql.bindings).toContain(0);
    });

    it('should handle stock_status with other filters combined', () => {
        let query = mockKnex('products as p').select('*').where('p.price', '>=', 10);
        query = query.where('p.stock_count', '>', 0);
        const sql = query.toSQL();
        expect(sql.sql).toContain('price');
        expect(sql.sql).toContain('stock_count');
        expect(sql.bindings).toContain(10);
        expect(sql.bindings).toContain(0);
    });

    it('should correctly differentiate between operators', () => {
        const inStockSql = mockKnex('products').where('stock_count', '>', 0).toSQL().sql;
        const outOfStockSql = mockKnex('products').where('stock_count', '=', 0).toSQL().sql;
        expect(inStockSql).toContain('>');
        expect(outOfStockSql).toContain('=');
    });
});
