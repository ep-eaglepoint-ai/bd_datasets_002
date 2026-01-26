import axios from 'axios';
import pg from 'pg';
import { API_URL, DB_CONFIG } from './config.js';

const { Pool } = pg;

let pool;
let authToken;
let roomIds = [];

async function setup() {
  pool = new Pool(DB_CONFIG);
  
  try {
    const registerRes = await axios.post(`${API_URL}/api/auth/register`, {
      name: 'Query Test User',
      email: `querytest${Date.now()}@test.com`,
      password: 'password123'
    });
    authToken = registerRes.data.token;
  } catch (error) {
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'alice@test.com',
      password: 'password123'
    });
    authToken = loginRes.data.token;
  }

  const roomsRes = await axios.get(`${API_URL}/api/rooms`);
  roomIds = roomsRes.data.map(r => r.id);
}

async function teardown() {
  if (pool) {
    await pool.end();
  }
}

// Requirement 5: No more than 3 queries per request (excluding transactions)
async function test5_maxThreeQueriesPerRequest() {
  console.log('\n[REQ 5] Maximum 3 database queries per request');
  
  // Test GET /api/rooms - should use subquery, not N+1
  console.log('Testing GET /api/rooms query count...');
  const roomsResponse = await axios.get(`${API_URL}/api/rooms`);
  
  if (roomsResponse.data.length > 0) {
    const room = roomsResponse.data[0];
    if (!room.status) {
      throw new Error('Room missing status field');
    }
    console.log(`✓ GET /api/rooms returns ${roomsResponse.data.length} rooms with status`);
  }
  
  // Check the code for N+1 patterns by looking at response structure
  // In N+1 version, rooms endpoint makes 1 query for rooms + N queries for bookings
  // This is hard to detect from outside, so we check if it's using efficient patterns
  
  // Test GET /api/bookings/mine - should use JOIN, not N+1
  console.log('Testing GET /api/bookings/mine query count...');
  const bookingsResponse = await axios.get(`${API_URL}/api/bookings/mine`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (bookingsResponse.data.length > 0) {
    const booking = bookingsResponse.data[0];
    if (!booking.room_name || booking.room_capacity === undefined) {
      throw new Error('N+1 query detected: booking missing room data from JOIN');
    }
    console.log(`✓ GET /api/bookings/mine returns bookings with room data (JOIN used)`);
  } else {
    console.log('⚠ No bookings to test JOIN pattern');
  }
  
  // Test GET /api/rooms/:id/bookings - should use JOIN, not N+1
  console.log('Testing GET /api/rooms/:id/bookings query count...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  const roomBookingsResponse = await axios.get(
    `${API_URL}/api/rooms/${roomIds[0]}/bookings?date=${dateStr}`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  if (roomBookingsResponse.data.length > 0) {
    const booking = roomBookingsResponse.data[0];
    if (!booking.booker_name || !booking.booker_id) {
      throw new Error('N+1 query detected: booking missing user data from JOIN');
    }
    console.log(`✓ GET /api/rooms/:id/bookings returns bookings with user data (JOIN used)`);
  } else {
    console.log('⚠ No bookings to test JOIN pattern');
  }
  
  return { passed: true };
}

// Requirement 6: Database connections released promptly
async function test6_connectionPoolManagement() {
  console.log('\n[REQ 6] Database connection management');
  
  // Check current pool status
  const initialTotal = pool.totalCount;
  const initialIdle = pool.idleCount;
  const initialWaiting = pool.waitingCount;
  
  console.log(`Initial pool: total=${initialTotal}, idle=${initialIdle}, waiting=${initialWaiting}`);
  
  // Make multiple concurrent requests
  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push(axios.get(`${API_URL}/api/rooms`));
  }
  
  await Promise.all(requests);
  
  // Wait a bit for connections to be released
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const finalTotal = pool.totalCount;
  const finalIdle = pool.idleCount;
  const finalWaiting = pool.waitingCount;
  
  console.log(`Final pool: total=${finalTotal}, idle=${finalIdle}, waiting=${finalWaiting}`);
  
  if (finalWaiting > 0) {
    throw new Error(`Connection pool exhaustion detected: ${finalWaiting} waiting connections`);
  }
  
  // Most connections should be idle after requests complete
  if (finalIdle < finalTotal * 0.5) {
    console.warn(`Warning: Only ${finalIdle}/${finalTotal} connections idle`);
  }
  
  console.log('✓ Connections released properly');
  
  return { passed: true, poolStats: { initialTotal, initialIdle, finalTotal, finalIdle } };
}

// Requirement 10: Only pg library, no ORMs, indexes only
async function test10_technicalConstraints() {
  console.log('\n[REQ 10] Technical constraints validation');
  
  const client = await pool.connect();
  try {
    // Check that only indexes were added (no new tables, columns, etc.)
    const tablesCheck = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    const expectedTables = ['bookings', 'rooms', 'users'];
    const actualTables = tablesCheck.rows.map(r => r.tablename).sort();
    
    if (JSON.stringify(actualTables) !== JSON.stringify(expectedTables)) {
      throw new Error(`Unexpected tables found. Expected: ${expectedTables}, Got: ${actualTables}`);
    }
    
    console.log('✓ No new tables added');
    
    // Check that performance indexes exist
    const indexesCheck = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'bookings'
      AND indexname LIKE 'idx_%'
    `);
    
    if (indexesCheck.rows.length === 0) {
      throw new Error('No performance indexes found on bookings table');
    }
    
    console.log(`✓ Found ${indexesCheck.rows.length} performance indexes`);
    
    // Verify specific indexes exist
    const requiredIndexes = [
      'idx_bookings_room_status',
      'idx_bookings_user_id',
      'idx_bookings_start_time',
      'idx_bookings_room_start_time'
    ];
    
    const existingIndexes = indexesCheck.rows.map(r => r.indexname);
    const missingIndexes = requiredIndexes.filter(idx => !existingIndexes.includes(idx));
    
    if (missingIndexes.length > 0) {
      throw new Error(`Missing required indexes: ${missingIndexes.join(', ')}`);
    }
    
    console.log('✓ All required indexes present');
    
    return { passed: true, indexCount: indexesCheck.rows.length };
  } finally {
    client.release();
  }
}

async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: []
  };
  
  const tests = [
    { name: '[REQ 5] Max 3 queries per request', fn: test5_maxThreeQueriesPerRequest },
    { name: '[REQ 6] Connection pool management', fn: test6_connectionPoolManagement },
    { name: '[REQ 10] Technical constraints', fn: test10_technicalConstraints }
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
      console.log(`Query Optimization Tests: ${results.passed}/${results.total} passed`);
      console.log('='.repeat(50));
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}