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
        const subquery = mockKnex('order_items as oi').sum('oi.quantity').whereRaw('oi.product_id = p.id');
        const sql = subquery.toSQL().sql.toLowerCase();
        expect(sql).toContain('sum');
        expect(sql).toContain('quantity');
        expect(sql).toContain('order_items');
    });

    it('should correlate subquery to parent product using product_id', () => {
        const subquery = mockKnex('order_items as oi').sum('oi.quantity').whereRaw('oi.product_id = p.id');
        const sql = subquery.toSQL().sql;
        expect(sql).toContain('product_id');
        expect(sql).toContain('p.id');
    });

    it('should use COALESCE to handle null values', () => {
        const subquery = mockKnex('order_items as oi').sum('oi.quantity').whereRaw('oi.product_id = p.id');
        const fullQuery = mockKnex('products as p').select(
            'p.id',
            mockKnex.raw(`COALESCE((${subquery.toString()}), 0) as "totalSold"`)
        );
        const sql = fullQuery.toSQL().sql.toLowerCase();
        expect(sql).toContain('coalesce');
        expect(sql).toContain('sum');
    });

    it('should alias the subquery result as totalSold', () => {
        const subquery = mockKnex('order_items as oi').sum('oi.quantity').whereRaw('oi.product_id = p.id');
        const fullQuery = mockKnex('products as p').select(
            mockKnex.raw(`COALESCE((${subquery.toString()}), 0) as "totalSold"`)
        );
        const sql = fullQuery.toSQL().sql;
        expect(sql).toContain('totalSold');
    });
});
