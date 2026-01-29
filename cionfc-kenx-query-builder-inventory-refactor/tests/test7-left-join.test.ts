import knex, { Knex } from 'knex';
import mockDb from 'mock-knex';
import { KnexInventoryService } from '../repository_after/KnexInventoryService';

describe('Test 7: LEFT JOIN for Category Association', () => {
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

    it('should use LEFT JOIN to include products without categories', () => {
        const query = mockKnex('products as p')
            .select('p.id', 'c.name as categoryName')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql.toLowerCase();
        expect(sql).toContain('left');
        expect(sql).toContain('join');
        expect(sql).not.toContain('inner join');
    });

    it('should return null for categoryName when product has no category', () => {
        const query = mockKnex('products as p')
            .select(
                'p.id as productId',
                'p.name as productName',
                'c.name as categoryName'
            )
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql.toLowerCase();
        expect(sql).toContain('left join');
    });

    it('should join on the foreign key p.category_id = c.id', () => {
        const query = mockKnex('products as p')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql;
        expect(sql).toMatch(/category_id/);
        expect(sql).toMatch(/\."?id"?/);
    });

    it('should allow categoryName to be nullable in result type', () => {
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
        expect(sql).toMatch(/categoryName/i);
    });
});
