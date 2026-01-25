"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.db = exports.redis = void 0;
exports.transaction = transaction;
const ioredis_1 = __importDefault(require("ioredis"));
const pg_1 = require("pg");
exports.redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});
exports.db = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'inventory_db',
    user: process.env.DB_USER || 'inventory_user',
    password: process.env.DB_PASSWORD || 'inventory_pass',
    max: 50,
});
exports.logger = {
    info: (data) => {
        console.log(JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), ...data }));
    },
    warn: (data) => {
        console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), ...data }));
    },
    error: (data) => {
        console.error(JSON.stringify({ level: 'error', timestamp: new Date().toISOString(), ...data }));
    }
};
async function transaction(callback) {
    const client = await exports.db.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
