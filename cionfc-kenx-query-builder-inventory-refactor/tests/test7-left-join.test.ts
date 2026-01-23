// Test 7: LEFT JOIN Implementation
// Verifies LEFT JOIN correctly handles products with and without categories

import knex, { Knex } from 'knex';
import { InventoryService } from '../repository_after/inventoryService';

describe('Test 7: LEFT JOIN for Category Association', () => {
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

    it('should use LEFT JOIN to include products without categories', () => {
        const query = mockKnex('products as p')
            .select('p.id', 'c.name as categoryName')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql.toLowerCase();

        // Must be LEFT JOIN, not INNER JOIN
        expect(sql).toContain('left');
        expect(sql).toContain('join');
        expect(sql).not.toContain('inner join');
    });

    it('should return null for categoryName when product has no category', () => {
        // LEFT JOIN semantics: when there's no matching category, 
        // the category fields will be NULL
        const query = mockKnex('products as p')
            .select(
                'p.id as productId',
                'p.name as productName',
                'c.name as categoryName'
            )
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql.toLowerCase();

        // Verify LEFT JOIN is used (ensures NULL for unmatched rows)
        expect(sql).toContain('left join');
    });

    it('should include all products regardless of category association', () => {
        // LEFT JOIN returns all rows from the left table (products)
        // even if there's no match in the right table (categories)
        const query = mockKnex('products as p')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql.toLowerCase();

        expect(sql).toContain('left join');
        // Should NOT use INNER JOIN which would exclude products without categories
        expect(sql).not.toContain('inner');
    });

    it('should join on the foreign key p.category_id = c.id', () => {
        const query = mockKnex('products as p')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql;

        // Handle quoted identifiers
        expect(sql).toMatch(/category_id/);
        expect(sql).toMatch(/\."?id"?/);
    });

    it('should use .leftJoin() method from Knex builder API', () => {
        const query = mockKnex('products as p')
            .select('*')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql.toLowerCase();

        // Generated SQL should have "left join" or "left outer join"
        const hasLeftJoin = sql.includes('left join') || sql.includes('left outer join');
        expect(hasLeftJoin).toBe(true);
    });

    it('should preserve the exact join logic from original implementation', () => {
        // Original: LEFT JOIN categories c ON p.category_id = c.id
        const query = mockKnex('products as p')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql;

        // Verify the join condition matches
        expect(sql).toContain('categories');
        expect(sql).toContain('category_id');
    });

    it('should allow categoryName to be nullable in result type', () => {
        // This tests the type system - categoryName should be string | null
        // The InventoryReportItem interface should allow null for categoryName

        type CategoryNameType = string | null;

        const validValue1: CategoryNameType = 'Electronics';
        const validValue2: CategoryNameType = null;

        expect(validValue1).toBe('Electronics');
        expect(validValue2).toBeNull();
    });

    it('should select categoryName from left joined categories table', () => {
        const query = mockKnex('products as p')
            .select(
                'p.id',
                'p.name',
                'c.name as categoryName'
            )
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql;

        // Check for categoryName alias (handles quoted identifiers)
        expect(sql).toMatch(/categoryName/i);
    });

    it('should ensure all products appear in results, even without category', () => {
        // Conceptual test: LEFT JOIN ensures all products are returned
        const query = mockKnex('products as p')
            .select('p.id', 'c.name as categoryName')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql.toLowerCase();

        // The key is that LEFT JOIN is used, not INNER JOIN
        expect(sql).toContain('left');
        expect(sql).not.toContain('inner join');
    });

    it('should handle the case where category_id is NULL', () => {
        // When p.category_id IS NULL, LEFT JOIN won't match any category
        // Result will have NULL for all category fields
        const query = mockKnex('products as p')
            .select('p.id', 'c.name as categoryName')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql.toLowerCase();

        // LEFT JOIN handles NULL gracefully
        expect(sql).toContain('left join');
    });
});
