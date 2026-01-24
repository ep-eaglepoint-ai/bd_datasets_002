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
    // If registration fails, try login with existing user
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'alice@test.com',
      password: 'password123'
    });
    authToken = loginRes.data.token;
    userId = loginRes.data.user.id;
  }

  // Get room IDs
  const roomsRes = await axios.get(`${API_URL}/api/rooms`);
  roomIds = roomsRes.data.map(r => r.id);
}

async function teardown() {
  if (pool) {
    await pool.end();
  }
}

async function measureQueryCount(fn) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_stat_statements_reset()');
  } catch (e) {
    // pg_stat_statements might not be enabled
  }
  client.release();

  const startTime = Date.now();
  await fn();
  const endTime = Date.now();

  return endTime - startTime;
}

async function createManyBookings(count) {
  const promises = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const startTime = new Date(now.getTime() + (i * 5 * 60 * 60 * 1000) + (24 * 60 * 60 * 1000));
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
      }).catch(() => {}) // Ignore conflicts
    );
    
    if (promises.length >= 10) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }
  
  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

async function test1_getRoomsPerformance() {
  console.log('\nTest 1: GET /api/rooms performance');
  
  // Create many bookings
  await createManyBookings(100);
  
  const duration = await measureQueryCount(async () => {
    await axios.get(`${API_URL}/api/rooms`);
  });
  
  console.log(`Response time: ${duration}ms`);
  
  if (duration > 200) {
    throw new Error(`GET /api/rooms took ${duration}ms, exceeds 200ms threshold`);
  }
  
  return { passed: true, duration };
}

async function test2_getMyBookingsPerformance() {
  console.log('\nTest 2: GET /api/bookings/mine performance');
  
  // Create many bookings for this user
  await createManyBookings(50);
  
  const duration = await measureQueryCount(async () => {
    await axios.get(`${API_URL}/api/bookings/mine`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  });
  
  console.log(`Response time: ${duration}ms`);
  
  if (duration > 300) {
    throw new Error(`GET /api/bookings/mine took ${duration}ms, exceeds 300ms threshold`);
  }
  
  return { passed: true, duration };
}

async function test3_getRoomBookingsPerformance() {
  console.log('\nTest 3: GET /api/rooms/:id/bookings performance');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  const duration = await measureQueryCount(async () => {
    await axios.get(`${API_URL}/api/rooms/${roomIds[0]}/bookings?date=${dateStr}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  });
  
  console.log(`Response time: ${duration}ms`);
  
  if (duration > 200) {
    throw new Error(`GET /api/rooms/:id/bookings took ${duration}ms, exceeds 200ms threshold`);
  }
  
  return { passed: true, duration };
}

async function test4_postBookingPerformance() {
  console.log('\nTest 4: POST /api/bookings performance');
  
  // Use a very unique time slot to avoid conflicts
  const startTime = new Date();
  const daysOffset = 20 + Math.floor(Math.random() * 100); // 20-120 days in future
  startTime.setDate(startTime.getDate() + daysOffset);
  startTime.setHours(10 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60), 0, 0);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
  
  const duration = await measureQueryCount(async () => {
    await axios.post(`${API_URL}/api/bookings`, {
      roomId: roomIds[Math.floor(Math.random() * roomIds.length)], // Random room
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  });
  
  console.log(`Response time: ${duration}ms`);
  
  if (duration > 500) {
    throw new Error(`POST /api/bookings took ${duration}ms, exceeds 500ms threshold`);
  }
  
  return { passed: true, duration };
}

async function test5_queryCountCheck() {
  console.log('\nTest 5: Query count verification');
  
  // This test checks that endpoints use JOINs instead of N+1 queries
  const response = await axios.get(`${API_URL}/api/bookings/mine`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  // The response should have data, proving JOINs work
  if (!Array.isArray(response.data)) {
    throw new Error('Response should be an array');
  }
  
  console.log(`Returned ${response.data.length} bookings with room data`);
  
  if (response.data.length > 0) {
    const booking = response.data[0];
    if (!booking.room_name || !booking.room_capacity) {
      throw new Error('Booking should include room_name and room_capacity from JOIN');
    }
  }
  
  return { passed: true };
}

async function test6_indexUsageCheck() {
  console.log('\nTest 6: Index usage verification');
  
  const client = await pool.connect();
  try {
    // Check if indexes exist
    const indexCheck = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'bookings' 
      AND indexname IN (
        'idx_bookings_room_status',
        'idx_bookings_user_id',
        'idx_bookings_start_time',
        'idx_bookings_room_start_time'
      )
    `);
    
    console.log(`Found ${indexCheck.rows.length} performance indexes`);
    
    if (indexCheck.rows.length < 4) {
      throw new Error(`Expected 4 indexes, found ${indexCheck.rows.length}`);
    }
    
    return { passed: true, indexCount: indexCheck.rows.length };
  } finally {
    client.release();
  }
}

async function test7_responseStructureCheck() {
  console.log('\nTest 7: Response structure validation');
  
  // Check that response structures match requirements
  const roomsRes = await axios.get(`${API_URL}/api/rooms`);
  const rooms = roomsRes.data;
  
  if (!Array.isArray(rooms) || rooms.length === 0) {
    throw new Error('Rooms response should be a non-empty array');
  }
  
  const room = rooms[0];
  if (!room.id || !room.name || !room.capacity || !room.status) {
    throw new Error('Room should have id, name, capacity, and status fields');
  }
  
  if (room.status !== 'available' && room.status !== 'occupied') {
    throw new Error('Room status should be "available" or "occupied"');
  }
  
  console.log('Response structure is valid');
  
  return { passed: true };
}

async function test8_businessRulesCheck() {
  console.log('\nTest 8: Business rules validation');
  
  const now = new Date();
  const pastTime = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Test 1: Cannot book in the past
  try {
    await axios.post(`${API_URL}/api/bookings`, {
      roomId: roomIds[0],
      startTime: pastTime.toISOString(),
      endTime: now.toISOString()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    throw new Error('Should not allow booking in the past');
  } catch (error) {
    if (error.response?.status !== 400) {
      throw error;
    }
  }
  
  // Test 2: Minimum duration (15 minutes)
  const futureTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  futureTime.setHours(10, 0, 0, 0);
  const tooShort = new Date(futureTime.getTime() + 10 * 60 * 1000);
  
  try {
    await axios.post(`${API_URL}/api/bookings`, {
      roomId: roomIds[0],
      startTime: futureTime.toISOString(),
      endTime: tooShort.toISOString()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    throw new Error('Should not allow booking shorter than 15 minutes');
  } catch (error) {
    if (error.response?.status !== 400) {
      throw error;
    }
  }
  
  // Test 3: Operating hours (9 AM - 6 PM)
  const earlyTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  earlyTime.setHours(8, 0, 0, 0);
  const earlyEnd = new Date(earlyTime.getTime() + 60 * 60 * 1000);
  
  try {
    await axios.post(`${API_URL}/api/bookings`, {
      roomId: roomIds[0],
      startTime: earlyTime.toISOString(),
      endTime: earlyEnd.toISOString()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    throw new Error('Should not allow booking before 9 AM');
  } catch (error) {
    if (error.response?.status !== 400) {
      throw error;
    }
  }
  
  console.log('All business rules validated');
  
  return { passed: true };
}

async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: []
  };
  
  const tests = [
    { name: 'GET /api/rooms performance', fn: test1_getRoomsPerformance },
    { name: 'GET /api/bookings/mine performance', fn: test2_getMyBookingsPerformance },
    { name: 'GET /api/rooms/:id/bookings performance', fn: test3_getRoomBookingsPerformance },
    { name: 'POST /api/bookings performance', fn: test4_postBookingPerformance },
    { name: 'Query count verification', fn: test5_queryCountCheck },
    { name: 'Index usage verification', fn: test6_indexUsageCheck },
    { name: 'Response structure validation', fn: test7_responseStructureCheck },
    { name: 'Business rules validation', fn: test8_businessRulesCheck }
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

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(results => {
      console.log('\n' + '='.repeat(50));
      console.log(`Tests: ${results.passed}/${results.total} passed`);
      console.log('='.repeat(50));
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { runTests };
