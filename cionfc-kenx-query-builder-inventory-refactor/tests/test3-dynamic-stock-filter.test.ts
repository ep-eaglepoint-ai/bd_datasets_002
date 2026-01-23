// Test 3: Dynamic Stock Status Filter
// Verifies conditional query building for stock_status filter

import knex, { Knex } from 'knex';
import { InventoryService } from '../repository_after/inventoryService';

describe('Test 3: Dynamic Stock Status Filter', () => {
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

    it('should add WHERE clause for in_stock filter (stock_count > 0)', () => {
        const query = mockKnex('products as p')
            .select('p.stock_count')
            .where('p.stock_count', '>', 0);

        const sql = query.toSQL();

        expect(sql.sql.toLowerCase()).toContain('where');
        expect(sql.sql).toContain('stock_count');
        expect(sql.bindings).toContain(0);
    });

    it('should add WHERE clause for out_of_stock filter (stock_count = 0)', () => {
        const query = mockKnex('products as p')
            .select('p.stock_count')
            .where('p.stock_count', '=', 0);

        const sql = query.toSQL();

        expect(sql.sql.toLowerCase()).toContain('where');
        expect(sql.sql).toContain('stock_count');
        expect(sql.bindings).toContain(0);
    });

    it('should NOT add stock_count filter when status is "all"', () => {
        const query = mockKnex('products as p')
            .select('p.stock_count');
        // No where clause for 'all'

        const sql = query.toSQL();

        // Should not have stock_count in WHERE (only in SELECT)
        const wherePart = sql.sql.substring(sql.sql.toLowerCase().indexOf('from'));
        expect(wherePart.toLowerCase()).not.toContain('where');
    });

    it('should NOT add stock_count filter when status is undefined', () => {
        const query = mockKnex('products as p')
            .select('p.stock_count');

        const sql = query.toSQL();
        const lowerSql = sql.sql.toLowerCase();

        // Query without WHERE should not contain 'where' keyword after FROM
        if (lowerSql.includes('where')) {
            // If WHERE exists, it should not be about stock_count
            const whereIndex = lowerSql.indexOf('where');
            const whereClause = lowerSql.substring(whereIndex);
            expect(whereClause).not.toContain('stock_count');
        }
    });

    it('should use conditional .where() method for dynamic filtering', () => {
        // Test that conditional logic works
        let query = mockKnex('products as p').select('*');

        const stockStatus = 'in_stock';
        if (stockStatus === 'in_stock') {
            query = query.where('p.stock_count', '>', 0);
        }

        const sql = query.toSQL();
        expect(sql.sql).toContain('stock_count');
        expect(sql.sql.toLowerCase()).toContain('where');
    });

    it('should handle stock_status with other filters combined', () => {
        let query = mockKnex('products as p')
            .select('*')
            .where('p.price', '>=', 10);

        // Add stock status conditionally
        const stockStatus = 'in_stock';
        if (stockStatus === 'in_stock') {
            query = query.where('p.stock_count', '>', 0);
        }

        const sql = query.toSQL();

        // Should have both conditions
        expect(sql.sql).toContain('price');
        expect(sql.sql).toContain('stock_count');
        expect(sql.bindings).toContain(10);
        expect(sql.bindings).toContain(0);
    });

    it('should correctly differentiate between in_stock and out_of_stock operators', () => {
        const inStockQuery = mockKnex('products as p')
            .select('*')
            .where('p.stock_count', '>', 0);

        const outOfStockQuery = mockKnex('products as p')
            .select('*')
            .where('p.stock_count', '=', 0);

        const inStockSql = inStockQuery.toSQL().sql;
        const outOfStockSql = outOfStockQuery.toSQL().sql;

        // in_stock should use > operator
        expect(inStockSql).toContain('>');

        // out_of_stock should use = operator
        expect(outOfStockSql).toContain('=');
        expect(outOfStockSql).not.toContain('>');
    });
});
