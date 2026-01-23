
import Redis from 'ioredis';
import { Pool, PoolClient } from 'pg';


export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

export const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'inventory_db',
  user: process.env.DB_USER || 'inventory_user',
  password: process.env.DB_PASSWORD || 'inventory_pass',
  max: 50,
});

export const logger = {
  info: (data: any) => {
    console.log(JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), ...data }));
  },
  warn: (data: any) => {
    console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), ...data }));
  },
  error: (data: any) => {
    console.error(JSON.stringify({ level: 'error', timestamp: new Date().toISOString(), ...data }));
  }
};
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
