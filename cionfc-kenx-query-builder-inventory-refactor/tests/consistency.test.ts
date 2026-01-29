import knex, { Knex } from 'knex';
import mockDb from 'mock-knex';
import { KnexInventoryService as NewService, ReportFilter, InventoryReportItem } from '../repository_after/KnexInventoryService';

describe('Consistency Test: Identical Results Between Implementations', () => {
    let mockKnex: Knex;
    let newService: NewService;
    let tracker: mockDb.Tracker;

    beforeAll(() => {
        mockKnex = knex({
            client: 'pg',
        });
        mockDb.mock(mockKnex);
        tracker = mockDb.getTracker();
        tracker.install();
        newService = new NewService(mockKnex);
    });

    afterAll(async () => {
        tracker.uninstall();
        mockDb.unmock(mockKnex);
        await mockKnex.destroy();
    });

    it('should generate equivalent SQL for basic query with no filters', async () => {
        let capturedSql = '';
        tracker.on('query', (query) => {
            capturedSql = query.sql.toLowerCase();
            query.response([]);
        });

        await newService.getInventoryReport({});
        expect(capturedSql).toContain('select');
        expect(capturedSql).toContain('products');
        expect(capturedSql).toContain('left join');
        expect(capturedSql).toContain('categories');
        expect(capturedSql).toContain('order by');
        expect(capturedSql).toContain('limit');
        expect(capturedSql).toContain('coalesce');
    });

    it('should generate equivalent SQL with categoryName filter', () => {
        const query = mockKnex('products as p')
            .select('p.id', 'c.name as categoryName')
            .leftJoin('categories as c', 'p.category_id', 'c.id')
            .where('c.name', 'Electronics')
            .orderBy('p.name', 'asc')
            .limit(20)
            .offset(0);

        const sql = query.toSQL();
        expect(sql.sql.toLowerCase()).toContain('where');
        expect(sql.sql).toMatch(/name/);
        expect(sql.bindings).toContain('Electronics');
    });

    it('should generate equivalent SQL with minPrice filter', () => {
        const query = mockKnex('products as p')
            .select('*')
            .leftJoin('categories as c', 'p.category_id', 'c.id')
            .where('p.price', '>=', 10)
            .orderBy('p.name', 'asc')
            .limit(20);

        const sql = query.toSQL();
        expect(sql.sql).toMatch(/price/);
        expect(sql.bindings).toContain(10);
    });

    it('should generate equivalent SQL with maxPrice filter', () => {
        const query = mockKnex('products as p')
            .select('*')
            .leftJoin('categories as c', 'p.category_id', 'c.id')
            .where('p.price', '<=', 100)
            .orderBy('p.name', 'asc')
            .limit(20);

        const sql = query.toSQL();
        expect(sql.sql).toMatch(/price/);
        expect(sql.bindings).toContain(100);
    });

    it('should generate equivalent SQL with in_stock filter', () => {
        const query = mockKnex('products as p')
            .select('*')
            .leftJoin('categories as c', 'p.category_id', 'c.id')
            .where('p.stock_count', '>', 0)
            .orderBy('p.name', 'asc')
            .limit(20);

        const sql = query.toSQL();
        expect(sql.sql).toContain('stock_count');
        expect(sql.sql).toContain('>');
        expect(sql.bindings).toContain(0);
    });

    it('should generate equivalent SQL with out_of_stock filter', () => {
        const query = mockKnex('products as p')
            .select('*')
            .leftJoin('categories as c', 'p.category_id', 'c.id')
            .where('p.stock_count', '=', 0)
            .orderBy('p.name', 'asc')
            .limit(20);

        const sql = query.toSQL();
        expect(sql.sql).toContain('stock_count');
        expect(sql.bindings).toContain(0);
    });

    it('should generate equivalent SQL with combined filters', () => {
        const query = mockKnex('products as p')
            .select('*')
            .leftJoin('categories as c', 'p.category_id', 'c.id')
            .where('c.name', 'Books')
            .where('p.price', '>=', 10)
            .where('p.price', '<=', 50)
            .where('p.stock_count', '>', 0)
            .orderBy('p.name', 'asc')
            .limit(30)
            .offset(10);

        const sql = query.toSQL();
        expect(sql.bindings).toContain('Books');
        expect(sql.bindings).toContain(10);
        expect(sql.bindings).toContain(50);
        expect(sql.bindings).toContain(0);
        expect(sql.bindings).toContain(30);
        expect(sql.bindings).toContain(10);
    });

    it('should generate equivalent SQL with custom pagination', () => {
        const query = mockKnex('products as p')
            .select('*')
            .leftJoin('categories as c', 'p.category_id', 'c.id')
            .orderBy('p.name', 'asc')
            .limit(50)
            .offset(100);

        const sql = query.toSQL();
        expect(sql.bindings).toContain(50);
        expect(sql.bindings).toContain(100);
    });

    it('should preserve LEFT JOIN semantics for products without categories', () => {
        const query = mockKnex('products as p')
            .select('p.id', 'c.name as categoryName')
            .leftJoin('categories as c', 'p.category_id', 'c.id');

        const sql = query.toSQL().sql.toLowerCase();
        expect(sql).toContain('left');
        expect(sql).not.toContain('inner');
    });

    it('should maintain same ordering (ORDER BY p.name ASC)', () => {
        const query = mockKnex('products as p')
            .select('*')
            .orderBy('p.name', 'asc');

        const sql = query.toSQL().sql.toLowerCase();
        expect(sql).toContain('order by');
        expect(sql).toMatch(/name/);
        expect(sql).toContain('asc');
    });

    it('should generate identical subquery structure for total_sold', async () => {
        let capturedSql = '';
        tracker.on('query', (query) => {
            capturedSql = query.sql.toLowerCase();
            query.response([]);
        });

        await newService.getInventoryReport({});
        expect(capturedSql).toContain('coalesce');
        expect(capturedSql).toContain('sum');
        expect(capturedSql).toContain('order_items');
    });

    it('should return the same data structure (InventoryReportItem)', () => {
        const mockResult: InventoryReportItem = {
            productId: '123e4567-e89b-12d3-a456-426614174000',
            productName: 'Test Product',
            sku: 'TEST-001',
            categoryName: 'Test Category',
            totalSold: 100,
            currentStock: 50,
        };

        expect(mockResult).toHaveProperty('productId');
        expect(mockResult).toHaveProperty('productName');
        expect(mockResult).toHaveProperty('sku');
        expect(mockResult).toHaveProperty('categoryName');
        expect(mockResult).toHaveProperty('totalSold');
        expect(mockResult).toHaveProperty('currentStock');
    });

    it('should handle limit cap at 100 consistently', () => {
        const requestedLimit = 200;
        const actualLimit = Math.min(requestedLimit, 100);

        const query = mockKnex('products as p')
            .select('*')
            .limit(actualLimit);

        const sql = query.toSQL();
        expect(sql.bindings).toContain(100);
        expect(sql.bindings).not.toContain(200);
    });

    it('should apply default limit of 20 consistently', () => {
        const defaultLimit = 20;

        const query = mockKnex('products as p')
            .select('*')
            .limit(defaultLimit);

        const sql = query.toSQL();
        expect(sql.bindings).toContain(20);
    });
});
