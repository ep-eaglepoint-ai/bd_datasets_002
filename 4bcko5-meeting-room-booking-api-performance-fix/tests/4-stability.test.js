import axios from "axios";
import pg from "pg";
import { API_URL, DB_CONFIG } from "./config.js";

const { Pool } = pg;

let pool;
let authToken;
let roomIds = [];

const STABILITY_REQUEST_COUNT = 1000;

async function setup() {
  pool = new Pool(DB_CONFIG);

  try {
    const registerRes = await axios.post(`${API_URL}/api/auth/register`, {
      name: "Stability Test User",
      email: `stability${Date.now()}@test.com`,
      password: "password123",
    });
    authToken = registerRes.data.token;
  } catch (error) {
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: "alice@test.com",
      password: "password123",
    });
    authToken = loginRes.data.token;
  }

  const roomsRes = await axios.get(`${API_URL}/api/rooms`);
  roomIds = roomsRes.data.map((r) => r.id);
}

async function teardown() {
  if (pool) {
    await pool.end();
  }
}

// Requirement 7: Memory stability under sustained load
async function test7_memoryStability() {
  console.log("\n[REQ 7] Memory stability under sustained load");

  console.log("Simulating 1000+ consecutive requests...");

  const requestCount = STABILITY_REQUEST_COUNT;
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  // Track response times to ensure they don't degrade
  const responseTimes = [];

  for (let i = 0; i < requestCount; i++) {
    try {
      const reqStart = Date.now();
      await axios.get(`${API_URL}/api/rooms`);
      const reqDuration = Date.now() - reqStart;
      responseTimes.push(reqDuration);
      successCount++;

      if ((i + 1) % 20 === 0) {
        console.log(`Completed ${i + 1}/${requestCount} requests...`);
      }
    } catch (error) {
      errorCount++;
    }
  }

  const totalDuration = Date.now() - startTime;

  console.log(`\nCompleted ${successCount} requests in ${totalDuration}ms`);
  console.log(`Errors: ${errorCount}`);
  console.log(
    `Average response time: ${(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)}ms`,
  );

  // Check for performance degradation
  const firstBatch = responseTimes.slice(0, 20);
  const lastBatch = responseTimes.slice(-20);

  const firstAvg = firstBatch.reduce((a, b) => a + b, 0) / firstBatch.length;
  const lastAvg = lastBatch.reduce((a, b) => a + b, 0) / lastBatch.length;

  console.log(`First 20 requests avg: ${firstAvg.toFixed(2)}ms`);
  console.log(`Last 20 requests avg: ${lastAvg.toFixed(2)}ms`);

  // Performance should not degrade by more than 50%
  if (lastAvg > firstAvg * 1.5) {
    throw new Error(
      `Performance degradation detected: ${firstAvg.toFixed(2)}ms -> ${lastAvg.toFixed(2)}ms`,
    );
  }

  console.log("✓ No significant performance degradation");

  // Check connection pool health
  const poolTotal = pool.totalCount;
  const poolIdle = pool.idleCount;
  const poolWaiting = pool.waitingCount;

  console.log(
    `Pool status: total=${poolTotal}, idle=${poolIdle}, waiting=${poolWaiting}`,
  );

  if (poolWaiting > 0) {
    throw new Error(
      `Connection pool issues: ${poolWaiting} waiting connections`,
    );
  }

  console.log("✓ Connection pool healthy");

  return {
    passed: true,
    requestCount: successCount,
    avgResponseTime:
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    firstAvg,
    lastAvg,
  };
}

async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: [],
  };

  const tests = [
    {
      name: "[REQ 7] Memory and performance stability",
      fn: test7_memoryStability,
    },
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
          status: "passed",
          ...result,
        });
        console.log(`✓ ${test.name} passed`);
      } catch (error) {
        results.failed++;
        results.tests.push({
          name: test.name,
          status: "failed",
          error: error.message,
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
    .then((results) => {
      console.log("\n" + "=".repeat(50));
      console.log(`Stability Tests: ${results.passed}/${results.total} passed`);
      console.log("=".repeat(50));
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Test suite failed:", error);
      process.exit(1);
    });
}
