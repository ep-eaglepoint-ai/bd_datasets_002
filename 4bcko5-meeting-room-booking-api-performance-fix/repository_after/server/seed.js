import bcrypt from 'bcrypt';
import pool from './db.js';

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting database setup...');
    
    await client.query('BEGIN');

    await client.query('CREATE EXTENSION IF NOT EXISTS btree_gist');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        capacity INTEGER NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_time_range CHECK (end_time > start_time)
      )
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_bookings'
        ) THEN
          ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
          EXCLUDE USING GIST (
            room_id WITH =,
            tsrange(start_time, end_time) WITH &&
          ) WHERE (status = 'active');
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_room_status 
      ON bookings(room_id, status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id 
      ON bookings(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_start_time 
      ON bookings(start_time);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_room_start_time 
      ON bookings(room_id, start_time) WHERE status = 'active';
    `);

    const rooms = [
      { name: 'Boardroom', capacity: 10 },
      { name: 'Focus Room', capacity: 4 },
      { name: 'Phone Booth', capacity: 2 },
    ];
    
    for (const room of rooms) {
      await client.query(
        'INSERT INTO rooms (name, capacity) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [room.name, room.capacity]
      );
    }

    const users = [
      { email: 'alice@test.com', name: 'Alice Smith' },
      { email: 'bob@test.com', name: 'Bob Johnson' },
    ];
    
    for (const user of users) {
      const passwordHash = await bcrypt.hash('password123', 10);
      await client.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
        [user.email, passwordHash, user.name]
      );
    }

    await client.query('COMMIT');
    console.log('Database seeded successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
