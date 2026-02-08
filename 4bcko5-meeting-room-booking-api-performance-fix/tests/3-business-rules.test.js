import axios from 'axios';
import pg from 'pg';
import { API_URL, DB_CONFIG } from './config.js';

const { Pool } = pg;

let pool;
let authToken;
let authToken2;
let userId;
let userId2;
let roomIds = [];

async function setup() {
  pool = new Pool(DB_CONFIG);
  
  // Create two users for authorization tests
  try {
    const registerRes = await axios.post(`${API_URL}/api/auth/register`, {
      name: 'Business Test User 1',
      email: `biztest1_${Date.now()}@test.com`,
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
  
  try {
    const registerRes2 = await axios.post(`${API_URL}/api/auth/register`, {
      name: 'Business Test User 2',
      email: `biztest2_${Date.now()}@test.com`,
      password: 'password123'
    });
    authToken2 = registerRes2.data.token;
    userId2 = registerRes2.data.user.id;
  } catch (error) {
    const loginRes2 = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'bob@test.com',
      password: 'password123'
    });
    authToken2 = loginRes2.data.token;
    userId2 = loginRes2.data.user.id;
  }

  const roomsRes = await axios.get(`${API_URL}/api/rooms`);
  roomIds = roomsRes.data.map(r => r.id);
}

async function teardown() {
  if (pool) {
    await pool.end();
  }
}

// Requirement 8: API response structures unchanged
async function test8_responseStructureCompatibility() {
  console.log('\n[REQ 8] API response structure compatibility');
  
  // Test GET /api/rooms structure
  const roomsRes = await axios.get(`${API_URL}/api/rooms`);
  if (roomsRes.data.length > 0) {
    const room = roomsRes.data[0];
    const requiredFields = ['id', 'name', 'capacity', 'status'];
    for (const field of requiredFields) {
      if (!(field in room)) {
        throw new Error(`GET /api/rooms missing field: ${field}`);
      }
    }
    if (!['available', 'occupied'].includes(room.status)) {
      throw new Error(`Invalid room status: ${room.status}`);
    }
    console.log('✓ GET /api/rooms structure valid');
  }
  
  // Test GET /api/bookings/mine structure
  const bookingsRes = await axios.get(`${API_URL}/api/bookings/mine`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (bookingsRes.data.length > 0) {
    const booking = bookingsRes.data[0];
    const requiredFields = ['id', 'room_id', 'user_id', 'start_time', 'end_time', 'status', 'room_name', 'room_capacity'];
    for (const field of requiredFields) {
      if (!(field in booking)) {
        throw new Error(`GET /api/bookings/mine missing field: ${field}`);
      }
    }
    console.log('✓ GET /api/bookings/mine structure valid');
  }
  
  // Test GET /api/rooms/:id/bookings structure
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  const roomBookingsRes = await axios.get(
    `${API_URL}/api/rooms/${roomIds[0]}/bookings?date=${dateStr}`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  if (roomBookingsRes.data.length > 0) {
    const booking = roomBookingsRes.data[0];
    const requiredFields = ['id', 'start_time', 'end_time', 'status', 'booker_name', 'booker_id'];
    for (const field of requiredFields) {
      if (!(field in booking)) {
        throw new Error(`GET /api/rooms/:id/bookings missing field: ${field}`);
      }
    }
    console.log('✓ GET /api/rooms/:id/bookings structure valid');
  }
  
  // Test POST /api/bookings structure
  const futureTime = new Date();
  futureTime.setDate(futureTime.getDate() + 300 + Math.floor(Math.random() * 100));
  futureTime.setHours(12, 0, 0, 0);
  const futureEnd = new Date(futureTime.getTime() + 60 * 60 * 1000);
  
  const createRes = await axios.post(`${API_URL}/api/bookings`, {
    roomId: roomIds[0],
    startTime: futureTime.toISOString(),
    endTime: futureEnd.toISOString()
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!createRes.data.message || !createRes.data.booking) {
    throw new Error('POST /api/bookings invalid response structure');
  }
  console.log('✓ POST /api/bookings structure valid');
  
  return { passed: true };
}

// Requirement 9: Business rules validation
async function test9_businessRulesValidation() {
  console.log('\n[REQ 9] Business rules validation');
  
  const now = new Date();
  
  // Rule 1: No past bookings
  console.log('Testing: No past bookings...');
  const pastTime = new Date(now.getTime() - 60 * 60 * 1000);
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
    console.log('✓ Past bookings rejected');
  }
  
  // Rule 2: Minimum duration (15 minutes)
  console.log('Testing: Minimum 15-minute duration...');
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
    console.log('✓ Short duration rejected');
  }
  
  // Rule 3: Maximum duration (4 hours)
  console.log('Testing: Maximum 4-hour duration...');
  const tooLong = new Date(futureTime.getTime() + 5 * 60 * 60 * 1000);
  
  try {
    await axios.post(`${API_URL}/api/bookings`, {
      roomId: roomIds[0],
      startTime: futureTime.toISOString(),
      endTime: tooLong.toISOString()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    throw new Error('Should not allow booking longer than 4 hours');
  } catch (error) {
    if (error.response?.status !== 400) {
      throw error;
    }
    console.log('✓ Long duration rejected');
  }
  
  // Rule 4: Operating hours (9 AM - 6 PM)
  console.log('Testing: Operating hours 9AM-6PM...');
  const earlyTime = new Date(futureTime);
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
    console.log('✓ Early hours rejected');
  }
  
  const lateTime = new Date(futureTime);
  lateTime.setHours(17, 30, 0, 0);
  const lateEnd = new Date(lateTime.getTime() + 60 * 60 * 1000);
  
  try {
    await axios.post(`${API_URL}/api/bookings`, {
      roomId: roomIds[0],
      startTime: lateTime.toISOString(),
      endTime: lateEnd.toISOString()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    throw new Error('Should not allow booking after 6 PM');
  } catch (error) {
    if (error.response?.status !== 400) {
      throw error;
    }
    console.log('✓ Late hours rejected');
  }
  
  // Rule 5: No midnight crossing
  console.log('Testing: No midnight crossing...');
  const nightTime = new Date(futureTime);
  nightTime.setHours(17, 0, 0, 0);
  const nextDay = new Date(nightTime);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(1, 0, 0, 0);
  
  try {
    await axios.post(`${API_URL}/api/bookings`, {
      roomId: roomIds[0],
      startTime: nightTime.toISOString(),
      endTime: nextDay.toISOString()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    throw new Error('Should not allow booking crossing midnight');
  } catch (error) {
    if (error.response?.status !== 400) {
      throw error;
    }
    console.log('✓ Midnight crossing rejected');
  }
  
  // Rule 6: Overlap prevention (GIST constraint)
  console.log('Testing: Overlap prevention...');
  const validTime = new Date(now.getTime() + (500 + Math.floor(Math.random() * 100)) * 24 * 60 * 60 * 1000);
  validTime.setHours(13, 0, 0, 0);
  const validEnd = new Date(validTime.getTime() + 60 * 60 * 1000);
  
  // Create first booking
  const firstBooking = await axios.post(`${API_URL}/api/bookings`, {
    roomId: roomIds[0],
    startTime: validTime.toISOString(),
    endTime: validEnd.toISOString()
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log(`Created booking at ${validTime.toISOString()}`);
  
  // Try to create overlapping booking with a different time to ensure overlap
  const overlapTime = new Date(validTime.getTime() + 30 * 60 * 1000); // 30 min after start
  const overlapEnd = new Date(overlapTime.getTime() + 60 * 60 * 1000);
  
  try {
    await axios.post(`${API_URL}/api/bookings`, {
      roomId: roomIds[0],
      startTime: overlapTime.toISOString(),
      endTime: overlapEnd.toISOString()
    }, {
      headers: { Authorization: `Bearer ${authToken2}` }
    });
    throw new Error('Should not allow overlapping bookings');
  } catch (error) {
    if (error.response?.status !== 409) {
      throw new Error(`Expected 409 conflict, got ${error.response?.status}: ${error.message}`);
    }
    console.log('✓ Overlapping bookings rejected');
  }
  
  // Rule 7: Authorization - users can only cancel own bookings
  console.log('Testing: Authorization for cancellation...');
  const myBookings = await axios.get(`${API_URL}/api/bookings/mine`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (myBookings.data.length > 0) {
    const bookingId = myBookings.data[0].id;
    
    // Try to cancel with different user
    try {
      await axios.delete(`${API_URL}/api/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${authToken2}` }
      });
      throw new Error('Should not allow canceling other user bookings');
    } catch (error) {
      if (error.response?.status !== 403) {
        throw error;
      }
      console.log('✓ Authorization check working');
    }
  }
  
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
    { name: '[REQ 8] API response structure compatibility', fn: test8_responseStructureCompatibility },
    { name: '[REQ 9] Business rules validation', fn: test9_businessRulesValidation }
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
      console.log(`Business Rules Tests: ${results.passed}/${results.total} passed`);
      console.log('='.repeat(50));
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}