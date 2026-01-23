import bcrypt from 'bcryptjs';
import pool, { initDb } from './db.js';

async function seed() {
  await initDb();
  
  const client = await pool.connect();
  try {
    // Clear existing data
    await client.query('DELETE FROM bookings');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM rooms');
    
    // Reset sequences
    await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE rooms_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE bookings_id_seq RESTART WITH 1');

    // Insert rooms
    await client.query(`
      INSERT INTO rooms (name, capacity) VALUES
        ('Boardroom', 10),
        ('Focus Room', 4),
        ('Phone Booth', 2)
    `);
    console.log('Rooms seeded');

    // Insert test users
    const passwordHash = await bcrypt.hash('password123', 10);
    await client.query(`
      INSERT INTO users (email, password_hash, name) VALUES
        ('alice@test.com', $1, 'Alice Johnson'),
        ('bob@test.com', $1, 'Bob Smith')
    `, [passwordHash]);
    console.log('Users seeded');

    console.log('Seed completed successfully');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
