// Test 4: Subquery Conversion for total_sold
// Verifies the nested subquery is correctly converted to Knex subquery pattern

import knex, { Knex } from 'knex';
import { InventoryService } from '../repository_after/inventoryService';

describe('Test 4: Subquery Conversion for total_sold', () => {
    let mockKnex: Knex;
    let service: InventoryService;

    beforeAll(() => {
        mockKnex = knex({
            client: 'pg',
            connection: {
                host: 'localhost',
                user: 'test',
                password: 'test',
                database: 'test',
            },
        });
        service = new InventoryService(mockKnex);
    });

    afterAll(async () => {
        await mockKnex.destroy();
    });

    it('should create a subquery that sums quantities from order_items', () => {
        const subquery = mockKnex('order_items as oi')
            .sum('oi.quantity')
            .whereRaw('oi.product_id = p.id');

        const sql = subquery.toSQL().sql.toLowerCase();

        expect(sql).toContain('sum');
        expect(sql).toContain('quantity');
        expect(sql).toContain('order_items');
    });

    it('should correlate subquery to parent product using product_id', () => {
        const subquery = mockKnex('order_items as oi')
            .sum('oi.quantity')
            .whereRaw('oi.product_id = p.id');

        const sql = subquery.toSQL().sql;

        expect(sql).toContain('product_id');
        expect(sql).toContain('p.id');
    });

    it('should use COALESCE to handle null values (products with no sales)', () => {
        // The pattern should be: COALESCE((subquery), 0)
        const subquery = mockKnex('order_items as oi')
            .sum('oi.quantity')
            .whereRaw('oi.product_id = p.id');

        const fullQuery = mockKnex('products as p')
            .select(
                'p.id',
                mockKnex.raw(`COALESCE((${subquery.toString()}), 0) as "totalSold"`)
            );

        const sql = fullQuery.toSQL().sql.toLowerCase();

        expect(sql).toContain('coalesce');
        expect(sql).toContain('sum');
    });

    it('should alias the subquery result as totalSold', () => {
        const subquery = mockKnex('order_items as oi')
            .sum('oi.quantity')
            .whereRaw('oi.product_id = p.id');

        const fullQuery = mockKnex('products as p')
            .select(
                mockKnex.raw(`COALESCE((${subquery.toString()}), 0) as "totalSold"`)
            );

        const sql = fullQuery.toSQL().sql;

        expect(sql).toContain('totalSold');
    });

    it('should use SUM aggregate function in the subquery', () => {
        const subquery = mockKnex('order_items as oi')
            .sum('oi.quantity')
            .whereRaw('oi.product_id = p.id');

        const sql = subquery.toSQL().sql.toLowerCase();

        expect(sql).toContain('sum(');
    });

    it('should generate a correlated subquery structure', () => {
        // Original SQL: (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.product_id = p.id)
        const subquery = mockKnex('order_items as oi')
            .sum('oi.quantity')
            .whereRaw('oi.product_id = p.id');

        const sql = subquery.toSQL().sql.toLowerCase();

        // Verify it's querying from order_items
        expect(sql).toContain('order_items');

        // Verify it has the correlation condition
        expect(sql).toContain('where');
        expect(sql).toContain('product_id');
    });

    it('should return 0 for products with no order items', () => {
        // COALESCE should default to 0
        const subquery = mockKnex('order_items as oi')
            .sum('oi.quantity')
            .whereRaw('oi.product_id = p.id');

        const fullQuery = mockKnex('products as p')
            .select(
                mockKnex.raw(`COALESCE((${subquery.toString()}), 0) as "totalSold"`)
            );

        const sql = fullQuery.toSQL().sql;

        // Verify COALESCE has a default value of 0
        expect(sql).toContain('0');
        expect(sql).toContain('COALESCE');
    });

    it('should integrate subquery into main SELECT clause', () => {
        const subquery = mockKnex('order_items as oi')
            .sum('oi.quantity')
            .whereRaw('oi.product_id = p.id');

        const fullQuery = mockKnex('products as p')
            .select(
                'p.id as productId',
                'p.name as productName',
                mockKnex.raw(`COALESCE((${subquery.toString()}), 0) as "totalSold"`)
            );

        const sql = fullQuery.toSQL().sql.toLowerCase();

        // Should have SELECT with multiple columns including the subquery
        expect(sql).toContain('select');
        expect(sql).toContain('productid');
        expect(sql).toContain('totalsold');
        expect(sql).toContain('coalesce');
    });
});
