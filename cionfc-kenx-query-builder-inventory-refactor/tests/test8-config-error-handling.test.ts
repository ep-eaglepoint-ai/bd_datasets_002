import knex, { Knex } from 'knex';
import mockDb from 'mock-knex';
import { KnexInventoryService, KnexConfig, ReportFilter } from '../repository_after/KnexInventoryService';

describe('Test 8: Knex Configuration and Error Handling', () => {
    it('should define KnexConfig interface with required properties', () => {
        const config: KnexConfig = {
            client: 'pg',
            connection: {
                host: 'localhost',
                port: 5432,
                user: 'testuser',
                password: 'testpass',
                database: 'testdb',
            },
        };

        expect(config.client).toBe('pg');
        expect(config.connection.host).toBe('localhost');
        expect(config.connection.port).toBe(5432);
        expect(config.connection.user).toBe('testuser');
        expect(config.connection.password).toBe('testpass');
        expect(config.connection.database).toBe('testdb');
    });

    it('should accept optional pool configuration in KnexConfig', () => {
        const configWithPool: KnexConfig = {
            client: 'pg',
            connection: {
                host: 'localhost',
                port: 5432,
                user: 'user',
                password: 'pass',
                database: 'db',
            },
            pool: {
                min: 2,
                max: 10,
            },
        };

        expect(configWithPool.pool).toBeDefined();
        expect(configWithPool.pool?.min).toBe(2);
        expect(configWithPool.pool?.max).toBe(10);
    });

    it('should accept KnexConfig without pool settings', () => {
        const configWithoutPool: KnexConfig = {
            client: 'pg',
            connection: {
                host: 'localhost',
                port: 5432,
                user: 'user',
                password: 'pass',
                database: 'db',
            },
        };

        expect(configWithoutPool.pool).toBeUndefined();
    });

    describe('Runtime Error Handling with mock-knex', () => {
        let mockKnex: Knex;
        let service: KnexInventoryService;
        let tracker: mockDb.Tracker;

        beforeEach(() => {
            mockKnex = knex({ client: 'pg' });
            mockDb.mock(mockKnex);
            tracker = mockDb.getTracker();
            tracker.install();
            service = new KnexInventoryService(mockKnex);
        });

        afterEach(async () => {
            tracker.uninstall();
            mockDb.unmock(mockKnex);
            await mockKnex.destroy();
        });

        it('should handle database connection errors gracefully', async () => {
            tracker.on('query', (query) => {
                query.reject(new Error('Connection timeout'));
            });

            try {
                await service.getInventoryReport({});
                throw new Error('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).toMatch(/Database query failed:.*Connection timeout/i);
            }
        });

        it('should wrap database errors with meaningful error messages', async () => {
            tracker.on('query', (query) => {
                query.reject(new Error('Syntax error at or near "AS"'));
            });

            await expect(service.getInventoryReport({})).rejects.toThrow(/Database query failed/i);
        });
    });

    it('should accept Knex instance in KnexInventoryService constructor', () => {
        const testKnex = knex({ client: 'pg' });
        const service = new KnexInventoryService(testKnex);
        expect(service).toBeInstanceOf(KnexInventoryService);
        testKnex.destroy();
    });

    it('should properly configure PostgreSQL client', () => {
        const config: KnexConfig = {
            client: 'pg',
            connection: {
                host: 'localhost',
                port: 5432,
                user: 'postgres',
                password: 'password',
                database: 'inventory',
            },
            pool: {
                min: 2,
                max: 10,
            },
        };

        const testKnex = knex(config);
        expect(testKnex).toBeDefined();
        testKnex.destroy();
    });

    it('should validate connection properties are correctly typed', () => {
        const connection = {
            host: 'localhost',
            port: 5432,
            user: 'testuser',
            password: 'testpass',
            database: 'testdb',
        };

        expect(typeof connection.host).toBe('string');
        expect(typeof connection.port).toBe('number');
        expect(typeof connection.user).toBe('string');
        expect(typeof connection.password).toBe('string');
        expect(typeof connection.database).toBe('string');
    });
});
