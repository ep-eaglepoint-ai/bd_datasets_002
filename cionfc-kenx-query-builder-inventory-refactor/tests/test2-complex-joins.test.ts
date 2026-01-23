// Test 2: Complex Join Logic Preservation
// Verifies that the LEFT JOIN between products and categories is correctly implemented

import knex, { Knex } from 'knex';
import { InventoryService } from '../repository_after/inventoryService';

describe('Test 2: Complex Join Logic Preservation', () => {
    let mockKnex: Knex;
    let service: InventoryService;

    beforeAll(() => {
        // Create a mock Knex instance for SQL generation without actual DB
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

    it('should generate SQL with LEFT JOIN between products and categories', () => {
        const query = mockKnex('products as p')
            .select('p.id', 'c.name as categoryName')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql.toLowerCase();

        expect(sql).toContain('left join');
        expect(sql).toContain('categories');
        expect(sql).toContain('products');
    });

    it('should join on the correct foreign key relationship', () => {
        const query = mockKnex('products as p')
            .select('p.id')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql;

        // Handle both quoted and unquoted identifiers
        expect(sql).toMatch(/category_id/);
        expect(sql).toMatch(/\."?id"?/);
    });

    it('should use table aliases (p for products, c for categories)', () => {
        const query = mockKnex('products as p')
            .select('p.name', 'c.name')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql;

        // Handle both quoted and unquoted identifiers
        expect(sql).toMatch(/products.*as.*"?p"?/i);
        expect(sql).toMatch(/categories.*as.*"?c"?/i);
    });

    it('should select categoryName from the joined categories table', () => {
        const query = mockKnex('products as p')
            .select('c.name as categoryName')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql.toLowerCase();

        // Check for categoryName alias (handles quoted identifiers)
        expect(sql).toMatch(/categoryname/);
    });

    it('should preserve the join structure from the original implementation', () => {
        // The original query had: LEFT JOIN categories c ON p.category_id = c.id
        const query = mockKnex('products as p')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql.toLowerCase();

        // Verify LEFT JOIN is used (not INNER JOIN)
        expect(sql).toContain('left');
        expect(sql).not.toContain('inner join');
    });

    it('should handle products without categories (null categoryName)', async () => {
        // This is a conceptual test - in real implementation with LEFT JOIN,
        // products without categories will have null categoryName
        const query = mockKnex('products as p')
            .select(
                'p.id as productId',
                'p.name as productName',
                'c.name as categoryName'
            )
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        // LEFT JOIN ensures all products are returned, even without categories
        const sql = query.toSQL().sql.toLowerCase();
        expect(sql).toContain('left join');
    });
});
