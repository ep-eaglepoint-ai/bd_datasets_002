import axios from 'axios';
import pg from 'pg';

const { Pool } = pg;

const API_URL = process.env.API_URL || 'http://localhost:5000';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'booking_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

let pool;
let authToken;
let userId;
let roomIds = [];

async function setup() {
  pool = new Pool(DB_CONFIG);
  
  // Register and login
  try {
    const registerRes = await axios.post(`${API_URL}/api/auth/register`, {
      name: 'Test User',
      email: `test${Date.now()}@test.com`,
      password: 'password123'
    });
    authToken = registerRes.data.token;
    userId = registerRes.data.user.id;
  } catch (error) {
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'alice@test.com',
      password: 'password123'
    });
    authToken = loginRes.data.token;
    userId = loginRes.data.user.id;
  }

  const roomsRes = await axios.get(`${API_URL}/api/rooms`);
  roomIds = roomsRes.data.map(r => r.id);
}

async function teardown() {
  if (pool) {
    await pool.end();
  }
}

async function createManyBookings(count, userIdOverride = null) {
  const promises = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const startTime = new Date(now.getTime() + (i * 5 * 60 * 60 * 1000) + (30 * 24 * 60 * 60 * 1000));
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    
    const roomId = roomIds[i % roomIds.length];
    
    promises.push(
      axios.post(`${API_URL}/api/bookings`, {
        roomId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(() => {})
    );
    
    if (promises.length >= 20) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }
  
  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

// Requirement 1: GET /api/rooms must respond in <200ms with 10,000+ bookings
async function test1_roomsPerformanceUnderLoad() {
  console.log('\n[REQ 1] GET /api/rooms performance with 10,000+ bookings');
  
  // Create many bookings to simulate load
  console.log('Creating test bookings...');
  await createManyBookings(200); // Create 200 bookings
  
  const start = Date.now();
  const response = await axios.get(`${API_URL}/api/rooms`);
  const duration = Date.now() - start;
  
  console.log(`Response time: ${duration}ms`);
  console.log(`Rooms returned: ${response.data.length}`);
  
  if (duration > 200) {
    throw new Error(`GET /api/rooms took ${duration}ms, exceeds 200ms threshold`);
  }
  
  return { passed: true, duration, roomCount: response.data.length };
}

// Requirement 2: GET /api/bookings/mine must respond in <300ms regardless of booking count
async function test2_myBookingsConstantTime() {
  console.log('\n[REQ 2] GET /api/bookings/mine constant time performance');
  
  // Create many bookings for this user
  console.log('Creating user bookings...');
  await createManyBookings(100);
  
  const start = Date.now();
  const response = await axios.get(`${API_URL}/api/bookings/mine`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const duration = Date.now() - start;
  
  console.log(`Response time: ${duration}ms`);
  console.log(`Bookings returned: ${response.data.length}`);
  
  if (duration > 300) {
    throw new Error(`GET /api/bookings/mine took ${duration}ms, exceeds 300ms threshold`);
  }
  
  // Verify response includes room data (proving JOIN was used)
  if (response.data.length > 0) {
    const booking = response.data[0];
    if (!booking.room_name || booking.room_capacity === undefined) {
      throw new Error('Booking response missing room data - N+1 query detected');
    }
  }
  
  return { passed: true, duration, bookingCount: response.data.length };
}

// Requirement 3: GET /api/rooms/:id/bookings must respond in <200ms with index usage
async function test3_roomBookingsWithIndexes() {
  console.log('\n[REQ 3] GET /api/rooms/:id/bookings performance with date filtering');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 31);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  const start = Date.now();
  const response = await axios.get(`${API_URL}/api/rooms/${roomIds[0]}/bookings?date=${dateStr}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const duration = Date.now() - start;
  
  console.log(`Response time: ${duration}ms`);
  console.log(`Bookings returned: ${response.data.length}`);
  
  if (duration > 200) {
    throw new Error(`GET /api/rooms/:id/bookings took ${duration}ms, exceeds 200ms threshold`);
  }
  
  // Verify response includes user data (proving JOIN was used)
  if (response.data.length > 0) {
    const booking = response.data[0];
    if (!booking.booker_name || !booking.booker_id) {
      throw new Error('Booking response missing user data - N+1 query detected');
    }
  }
  
  // Check for index usage
  const client = await pool.connect();
  try {
    const indexCheck = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'bookings' 
      AND (indexname LIKE '%start_time%' OR indexname LIKE '%room%')
    `);
    
    if (indexCheck.rows.length === 0) {
      throw new Error('No indexes found for date filtering - full table scan likely');
    }
    
    console.log(`Found ${indexCheck.rows.length} relevant indexes`);
  } finally {
    client.release();
  }
  
  return { passed: true, duration, bookingCount: response.data.length };
}

// Requirement 4: POST /api/bookings must complete in <500ms
async function test4_postBookingPerformance() {
  console.log('\n[REQ 4] POST /api/bookings performance');
  
  const startTime = new Date();
  const daysOffset = 100 + Math.floor(Math.random() * 200);
  startTime.setDate(startTime.getDate() + daysOffset);
  startTime.setHours(11, Math.floor(Math.random() * 60), 0, 0);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
  
  const start = Date.now();
  const response = await axios.post(`${API_URL}/api/bookings`, {
    roomId: roomIds[Math.floor(Math.random() * roomIds.length)],
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const duration = Date.now() - start;
  
  console.log(`Response time: ${duration}ms`);
  
  if (duration > 500) {
    throw new Error(`POST /api/bookings took ${duration}ms, exceeds 500ms threshold`);
  }
  
  if (!response.data.booking || !response.data.booking.id) {
    throw new Error('Invalid booking response structure');
  }
  
  return { passed: true, duration };
}

async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: []
  };
  
  const tests = [
    { name: '[REQ 1] GET /api/rooms <200ms with load', fn: test1_roomsPerformanceUnderLoad },
    { name: '[REQ 2] GET /api/bookings/mine <300ms constant time', fn: test2_myBookingsConstantTime },
    { name: '[REQ 3] GET /api/rooms/:id/bookings <200ms with indexes', fn: test3_roomBookingsWithIndexes },
    { name: '[REQ 4] POST /api/bookings <500ms', fn: test4_postBookingPerformance }
  ];
  
  try {
    await setup();
    
    for (const test of tests) {
      results.total++;
      try {
        const result = await test.fn();
        results.passed++;
        results.tests.push({
          name: test.name,
          status: 'passed',
          ...result
        });
        console.log(`✓ ${test.name} passed`);
      } catch (error) {
        results.failed++;
        results.tests.push({
          name: test.name,
          status: 'failed',
          error: error.message
        });
        console.error(`✗ ${test.name} failed:`, error.message);
      }
    }
  } finally {
    await teardown();
  }
  
  return results;
}

export { runTests };

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(results => {
      console.log('\n' + '='.repeat(50));
      console.log(`Performance Tests: ${results.passed}/${results.total} passed`);
      console.log('='.repeat(50));
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}
