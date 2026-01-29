import knex, { Knex } from 'knex';
import mockDb from 'mock-knex';
import { KnexInventoryService } from '../repository_after/KnexInventoryService';

describe('Test 2: Complex Join Logic Preservation', () => {
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

    it('should generate SQL with LEFT JOIN between products and categories', () => {
        const query = mockKnex('products as p').select('p.id', 'c.name as categoryName').leftJoin('categories as c', 'p.category_id', 'c.id');
        const sql = query.toSQL().sql.toLowerCase();
        expect(sql).toContain('left join');
        expect(sql).toContain('categories');
        expect(sql).toContain('products');
    });

    it('should join on the correct foreign key relationship', () => {
        const query = mockKnex('products as p').select('p.id').leftJoin('categories as c', 'p.category_id', 'c.id');
        const sql = query.toSQL().sql;
        expect(sql).toMatch(/category_id/);
        expect(sql).toMatch(/\."?id"?/);
    });

    it('should use table aliases', () => {
        const query = mockKnex('products as p').select('p.name', 'c.name').leftJoin('categories as c', 'p.category_id', 'c.id');
        const sql = query.toSQL().sql;
        expect(sql).toMatch(/products.*as.*"?p"?/i);
        expect(sql).toMatch(/categories.*as.*"?c"?/i);
    });

    it('should select categoryName from the joined categories table', () => {
        const query = mockKnex('products as p').select('c.name as categoryName').leftJoin('categories as c', 'p.category_id', 'c.id');
        const sql = query.toSQL().sql.toLowerCase();
        expect(sql).toMatch(/categoryname/);
    });
});
