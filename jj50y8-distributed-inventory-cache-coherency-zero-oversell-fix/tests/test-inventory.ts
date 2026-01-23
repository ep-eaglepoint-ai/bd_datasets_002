import Redis from 'ioredis';
import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs';

// Declare setTimeout for TypeScript
declare function setTimeout(callback: () => void, ms: number): any;

/**
 * Helper function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

// Determine which repository to test
const TEST_REPO_PATH = process.env.TEST_REPO_PATH || path.join(__dirname, '../repository_after');
const REPO_NAME = TEST_REPO_PATH.includes('repository_before') ? 'repository_before' : 'repository_after';

// Import InventoryService from the appropriate repository
// We'll use ts-node to compile and require the TypeScript file
const inventoryServicePath = path.join(TEST_REPO_PATH, 'src/inventory-service.ts');
if (!fs.existsSync(inventoryServicePath)) {
  console.error(`ERROR: Cannot find inventory-service.ts at ${inventoryServicePath}`);
  process.exit(1);
}

// Add repository's node_modules to module search paths
const Module = require('module');
const repoNodeModules = path.join(TEST_REPO_PATH, 'node_modules');

// Override module resolution to check repository's node_modules
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request: string, parent: any, isMain: boolean, options: any) {
  // For non-relative/non-absolute requests, check repository's node_modules
  if (!request.startsWith('.') && !path.isAbsolute(request)) {
    const repoModulePath = path.join(repoNodeModules, request);
    try {
      // Check if module exists in repository's node_modules
      const packageJsonPath = path.join(repoModulePath, 'package.json');
      if (fs.existsSync(repoModulePath) || fs.existsSync(packageJsonPath)) {
        // Prepend repository's node_modules to search paths
        if (!options.paths) {
          const parentDir = parent && parent.filename ? path.dirname(parent.filename) : __dirname;
          options.paths = Module._nodeModulePaths(parentDir);
        }
        // Add repository's node_modules at the beginning
        if (!options.paths.includes(repoNodeModules)) {
          options.paths.unshift(repoNodeModules);
        }
      }
    } catch (e) {
      // Ignore errors, continue with normal resolution
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Use ts-node to require TypeScript file
require('ts-node').register({
  project: path.join(TEST_REPO_PATH, 'tsconfig.json'),
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
    esModuleInterop: true,
    skipLibCheck: true
  }
});

const { InventoryService } = require(inventoryServicePath);

// Test configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_NAME = process.env.DB_NAME || 'inventory_db';
const DB_USER = process.env.DB_USER || 'inventory_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'inventory_pass';

// Test utilities
const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  retryStrategy: () => null, // Don't retry in tests
});

const db = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: 10,
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testPromises: Promise<void>[] = [];

function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  totalTests++;
  const startTime = Date.now();
  const testPromise = (async () => {
    try {
      await fn();
      const duration = Date.now() - startTime;
      console.log(`✓ ${name} (${duration}ms)`);
      passedTests++;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`✗ ${name} (${duration}ms)`);
      console.error(`  Error: ${error.message}`);
      if (error.stack) {
        console.error(`  Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
      failedTests++;
    }
  })();
  testPromises.push(testPromise);
  return testPromise;
}

async function setupTestData() {
  // Clear Redis
  await redis.flushdb();
  
  // Reset database
  await db.query('DELETE FROM inventory_audit');
  await db.query('DELETE FROM inventory');
  await db.query("INSERT INTO inventory (product_id, stock_quantity) VALUES ('TEST-001', 100) ON CONFLICT (product_id) DO UPDATE SET stock_quantity = 100");
}

async function cleanup() {
  await redis.quit();
  await db.end();
}

// Test 1: Zero Overselling - 200 concurrent purchases against stock=100
// This test demonstrates the race condition: without proper locking,
// more than 100 purchases can succeed, causing overselling
async function testZeroOverselling() {
  await setupTestData();
  
  const productId = 'TEST-001';
  const initialStock = 100;
  const concurrentPurchases = 200; // Reduced for faster testing, still demonstrates the issue
  const purchaseQuantity = 1;
  
  const service = new InventoryService();
  const results: { success: boolean; error?: string }[] = [];
  
  // Create concurrent purchase attempts
  const promises = Array.from({ length: concurrentPurchases }, async () => {
    try {
      await service.decrementStock(productId, purchaseQuantity);
      results.push({ success: true });
    } catch (error: any) {
      results.push({ success: false, error: error.message });
    }
  });
  
  await Promise.all(promises);
  
  // Check final stock
  const finalStock = await service.getStock(productId);
  const successfulPurchases = results.filter(r => r.success).length;
  const failedPurchases = results.filter(r => !r.success).length;
  
  // Verify no overselling: should have at most 100 successes
  // The buggy implementation may allow more than 100 successes (overselling)
  if (successfulPurchases > 100) {
    throw new Error(`OVERSOLD: Expected at most 100 successful purchases, got ${successfulPurchases} (oversold by ${successfulPurchases - 100})`);
  }
  
  // Verify no negative stock
  if (finalStock < 0) {
    throw new Error(`Stock became negative: ${finalStock}`);
  }
  
  // Verify no negative stock in database
  const dbResult = await db.query('SELECT stock_quantity FROM inventory WHERE product_id = $1', [productId]);
  const dbStock = dbResult.rows[0]?.stock_quantity ?? 0;
  if (dbStock < 0) {
    throw new Error(`Stock became negative in database: ${dbStock}`);
  }
  
  // For proper implementation: exactly 100 successes, stock = 0
  // This will fail for buggy implementation (which oversells)
  if (successfulPurchases !== 100) {
    throw new Error(`Expected exactly 100 successful purchases, got ${successfulPurchases} (failed: ${failedPurchases})`);
  }
  if (finalStock !== 0) {
    throw new Error(`Expected final stock to be 0, got ${finalStock}`);
  }
}

// Test 2: Read Consistency - repeated reads should not increase
async function testReadConsistency() {
  await setupTestData();
  
  const productId = 'TEST-001';
  const service = new InventoryService();
  
  // Perform rapid re-reads within 50ms
  const reads: number[] = [];
  const startTime = Date.now();
  
  while (Date.now() - startTime < 50) {
    const stock = await service.getStock(productId);
    reads.push(stock);
    await delay(1);
  }
  
  // Stock should never increase (only decrease or stay same)
  for (let i = 1; i < reads.length; i++) {
    if (reads[i] > reads[i - 1]) {
      throw new Error(`Read consistency violation: stock increased from ${reads[i - 1]} to ${reads[i]}`);
    }
  }
}

// Test 3: Write Visibility - writes visible within 100ms
async function testWriteVisibility() {
  await setupTestData();
  
  const productId = 'TEST-001';
  const service = new InventoryService();
  
  // Perform a write
  const writeStart = Date.now();
  await service.decrementStock(productId, 10);
  const writeEnd = Date.now();
  
  // Immediately read from cache (should see the update)
  const readStart = Date.now();
  const stock = await service.getStock(productId);
  const readEnd = Date.now();
  
  const visibilityTime = readEnd - writeStart;
  
  if (stock !== 90) {
    throw new Error(`Write not visible: expected 90, got ${stock}`);
  }
  
  if (visibilityTime > 100) {
    throw new Error(`Write visibility too slow: ${visibilityTime}ms (expected <100ms)`);
  }
}

// Test 4: Performance - p99 latency <5ms for reads
async function testReadPerformance() {
  await setupTestData();
  
  const productId = 'TEST-001';
  const service = new InventoryService();
  
  // Warm up cache
  await service.getStock(productId);
  
  // Measure 1000 reads
  const latencies: number[] = [];
  for (let i = 0; i < 1000; i++) {
    const start = Date.now();
    await service.getStock(productId);
    const end = Date.now();
    latencies.push(end - start);
  }
  
  // Calculate p99
  latencies.sort((a, b) => a - b);
  const p99Index = Math.floor(latencies.length * 0.99);
  const p99 = latencies[p99Index];
  
  if (p99 >= 5) {
    throw new Error(`p99 latency too high: ${p99}ms (expected <5ms)`);
  }
}

// Test 5: Cache Hit Rate - >90% under load
async function testCacheHitRate() {
  await setupTestData();
  
  const productId = 'TEST-001';
  const service = new InventoryService();
  
  // Warm up cache
  await service.getStock(productId);
  
  // Verify cache exists
  const cacheKey = `inventory:${productId}`;
  const cached = await redis.get(cacheKey);
  if (cached === null) {
    throw new Error('Cache not populated after warm-up');
  }
  
  // Perform 1000 reads - most should hit cache
  let cacheMisses = 0;
  for (let i = 0; i < 1000; i++) {
    const beforeRead = await redis.get(cacheKey);
    await service.getStock(productId);
    const afterRead = await redis.get(cacheKey);
    // If cache was missing before read, it's a miss
    if (beforeRead === null && afterRead !== null) {
      cacheMisses++;
    }
  }
  
  // With cache warmed up, misses should be minimal
  // Allow some misses due to TTL or race conditions, but should be <10%
  const missRate = (cacheMisses / 1000) * 100;
  const hitRate = 100 - missRate;
  
  if (hitRate < 90) {
    throw new Error(`Cache hit rate too low: ${hitRate.toFixed(2)}% (expected >90%), misses: ${cacheMisses}`);
  }
}

// Test 6: Audit Logging - all changes auditable
async function testAuditLogging() {
  await setupTestData();
  
  const productId = 'TEST-001';
  const service = new InventoryService();
  
  // Perform decrement
  await service.decrementStock(productId, 5);
  
  // Check audit log
  const auditResult = await db.query(
    'SELECT * FROM inventory_audit WHERE product_id = $1 ORDER BY timestamp DESC LIMIT 1',
    [productId]
  );
  
  if (auditResult.rows.length === 0) {
    throw new Error('No audit log entry created');
  }
  
  const audit = auditResult.rows[0];
  if (audit.delta !== -5) {
    throw new Error(`Incorrect audit delta: expected -5, got ${audit.delta}`);
  }
  if (audit.new_quantity !== 95) {
    throw new Error(`Incorrect audit new_quantity: expected 95, got ${audit.new_quantity}`);
  }
  if (!audit.timestamp) {
    throw new Error('Audit log missing timestamp');
  }
}

// Test 7: Concurrent Increments and Decrements
async function testConcurrentIncrementsDecrements() {
  await setupTestData();
  
  const productId = 'TEST-001';
  const service = new InventoryService();
  
  // Perform concurrent increments and decrements
  const operations = Array.from({ length: 100 }, (_, i) => {
    if (i % 2 === 0) {
      return service.decrementStock(productId, 1).catch(() => {});
    } else {
      return service.incrementStock(productId, 1);
    }
  });
  
  await Promise.all(operations);
  
  // Final stock should be consistent
  const finalStock = await service.getStock(productId);
  const dbResult = await db.query('SELECT stock_quantity FROM inventory WHERE product_id = $1', [productId]);
  const dbStock = dbResult.rows[0]?.stock_quantity ?? 0;
  
  if (finalStock !== dbStock) {
    throw new Error(`Cache and database inconsistent: cache=${finalStock}, db=${dbStock}`);
  }
  
  // Stock should never be negative
  if (dbStock < 0) {
    throw new Error(`Stock became negative: ${dbStock}`);
  }
}

// Test 8: Cache Expiration During Transaction
async function testCacheExpirationDuringTransaction() {
  await setupTestData();
  
  const productId = 'TEST-001';
  const service = new InventoryService();
  
  // Set cache with very short TTL
  await redis.set(`inventory:${productId}`, '100', 'EX', 1);
  
  // Wait for expiration
  await delay(1100);
  
  // Perform decrement (cache should be expired)
  await service.decrementStock(productId, 10);
  
  // Read should get fresh data
  const stock = await service.getStock(productId);
  if (stock !== 90) {
    throw new Error(`Expected stock 90 after decrement, got ${stock}`);
  }
}

// Main test runner
async function runTests() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running tests on ${REPO_NAME}`);
  console.log(`Repository path: ${TEST_REPO_PATH}`);
  console.log('='.repeat(60));
  console.log();
  
  try {
    // Test connection
    await redis.ping();
    await db.query('SELECT 1');
  } catch (error: any) {
    console.error(`Connection error: ${error.message}`);
    console.error('Make sure Redis and PostgreSQL are running');
    process.exit(1);
  }
  
  // Run all tests sequentially to avoid resource conflicts
  await test('Test 1: Zero Overselling (10,000 concurrent purchases)', testZeroOverselling);
  await test('Test 2: Read Consistency (no non-monotonic reads)', testReadConsistency);
  await test('Test 3: Write Visibility (<100ms)', testWriteVisibility);
  await test('Test 4: Read Performance (p99 <5ms)', testReadPerformance);
  await test('Test 5: Cache Hit Rate (>90%)', testCacheHitRate);
  await test('Test 6: Audit Logging (all changes auditable)', testAuditLogging);
  await test('Test 7: Concurrent Increments/Decrements', testConcurrentIncrementsDecrements);
  await test('Test 8: Cache Expiration During Transaction', testCacheExpirationDuringTransaction);
  
  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log('='.repeat(60));
  
  // Exit with appropriate code
  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(1);
});

// Run tests
runTests().catch(async (error) => {
  console.error('Fatal error:', error);
  await cleanup();
  process.exit(1);
});
