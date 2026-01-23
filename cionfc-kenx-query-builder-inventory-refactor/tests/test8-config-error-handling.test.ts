import knex, { Knex } from 'knex';
import { InventoryService, KnexConfig, ReportFilter } from '../repository_after/inventoryService';

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

    it('should handle database connection errors gracefully', async () => {
        const invalidKnex = knex({
            client: 'pg',
            connection: {
                host: 'invalid-host-that-does-not-exist',
                port: 9999,
                user: 'invalid',
                password: 'invalid',
                database: 'invalid',
            },
            pool: {
                min: 0,
                max: 1,
            },
            acquireConnectionTimeout: 1000,
        });

        const service = new InventoryService(invalidKnex);
        const filter: ReportFilter = {};
        await expect(service.getInventoryReport(filter)).rejects.toThrow();
        await invalidKnex.destroy();
    });

    it('should wrap database errors with meaningful error messages', async () => {
        const mockKnex = knex({
            client: 'pg',
            connection: {
                host: 'localhost',
                user: 'test',
                password: 'test',
                database: 'test',
            },
        });

        const service = new InventoryService(mockKnex);
        await expect(service.getInventoryReport({})).rejects.toThrow(/Database query failed/i);
        await mockKnex.destroy();
    });

    it('should accept Knex instance in InventoryService constructor', () => {
        const mockKnex = knex({
            client: 'pg',
            connection: {
                host: 'localhost',
                port: 5432,
                user: 'test',
                password: 'test',
                database: 'test',
            },
        });

        const service = new InventoryService(mockKnex);
        expect(service).toBeInstanceOf(InventoryService);
        mockKnex.destroy();
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
