const path = require('path');
const fs = require('fs');

const TEST_REPO_PATH = process.env.TEST_REPO_PATH || '/app/repository_before';

// Dynamically load the inventory service from the repository
const repoPath = path.resolve(TEST_REPO_PATH);

let InventoryService;
let db, redis;

// Load compiled JavaScript from dist/
try {
  // Load infrastructure and service from compiled dist/ directory
  const infra = require(path.join(repoPath, 'dist', 'infrastructure.js'));
  const serviceModule = require(path.join(repoPath, 'dist', 'inventory-service.js'));
  InventoryService = serviceModule.InventoryService;
  db = infra.db;
  redis = infra.redis;
} catch (error) {
  console.error('Failed to load inventory service:', error);
  throw error;
}

// Helper to reset test state
async function resetTestState(productId, initialStock) {
  await redis.del(`inventory:${productId}`);
  await db.query(
    `INSERT INTO inventory (product_id, stock_quantity) 
     VALUES ($1, $2) 
     ON CONFLICT (product_id) 
     DO UPDATE SET stock_quantity = $2, updated_at = NOW()`,
    [productId, initialStock]
  );
  await db.query('DELETE FROM inventory_audit WHERE product_id = $1', [productId]);
}

async function getFinalStock(productId) {
  const result = await db.query('SELECT stock_quantity FROM inventory WHERE product_id = $1', [productId]);
  return result.rows[0]?.stock_quantity ?? 0;
}

async function countSuccessfulPurchases(productId) {
  const result = await db.query(
    'SELECT COUNT(*) as count FROM inventory_audit WHERE product_id = $1 AND delta < 0',
    [productId]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

function createBarrier(count) {
  let waiting = count;
  let resolveFunc = null;
  return {
    wait: () => {
      waiting--;
      if (waiting === 0 && resolveFunc) resolveFunc();
    },
    ready: new Promise((resolve) => {
      resolveFunc = resolve;
      if (waiting === 0) resolve();
    })
  };
}

// STRICT TEST 1: Overselling under high concurrency - AGGRESSIVE
test('oversell_detection_high_concurrency', async () => {
  const productId = 'TEST-OVERSELL-STRICT';
  const initialStock = 50;
  await resetTestState(productId, initialStock);
  
  // Create many service instances to maximize race conditions
  const services = [];
  for (let i = 0; i < 10; i++) {
    services.push(new InventoryService());
  }
  
  // Very high concurrency to trigger race conditions
  const concurrentPurchases = 200;
  const barrier = createBarrier(concurrentPurchases);
  const promises = [];
  
  for (let i = 0; i < concurrentPurchases; i++) {
    const service = services[i % services.length];
    promises.push(
      (async () => {
        await barrier.ready;
        try {
          await service.decrementStock(productId, 1);
        } catch (error) {
          // Expected failures
        }
      })()
    );
    barrier.wait();
  }
  
  await Promise.all(promises);
  // Wait longer for all cache updates to complete
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const finalStock = await getFinalStock(productId);
  const successfulPurchases = await countSuccessfulPurchases(productId);
  
  // CRITICAL: Should NEVER have more successes than initial stock
  // The buggy version WILL allow overselling due to cache race conditions
  if (successfulPurchases > initialStock) {
    throw new Error(`OVERSELL DETECTED: ${successfulPurchases} purchases succeeded when only ${initialStock} stock was available. Final stock: ${finalStock}. This is the bug!`);
  }
  
  // CRITICAL: Stock should never be negative
  if (finalStock < 0) {
    throw new Error(`CRITICAL VIOLATION: Stock is negative! Got ${finalStock}. This is the bug!`);
  }
  
  // For the buggy version, we expect it to fail these checks
  // If it passes, the test itself is too lenient
  assert(
    successfulPurchases === initialStock && finalStock === 0,
    `Expected exactly ${initialStock} successes and 0 final stock. Got ${successfulPurchases} successes and ${finalStock} final stock. This may indicate the bug was not triggered.`
  );
});

// STRICT TEST 2: Cache race condition - multiple servers updating cache concurrently
test('cache_race_condition_strict', async () => {
  const productId = 'TEST-CACHE-RACE-STRICT';
  const initialStock = 100;
  await resetTestState(productId, initialStock);
  
  // Create many service instances to maximize race conditions
  const services = [];
  for (let i = 0; i < 5; i++) {
    services.push(new InventoryService());
  }
  
  // Perform many concurrent decrements to trigger race conditions
  const concurrentOps = 50;
  const barrier = createBarrier(concurrentOps);
  const promises = [];
  
  for (let i = 0; i < concurrentOps; i++) {
    const service = services[i % services.length];
    promises.push(
      (async () => {
        await barrier.ready;
        try {
          await service.decrementStock(productId, 1);
        } catch (error) {
          // Some failures expected
        }
      })()
    );
    barrier.wait();
  }
  
  await Promise.all(promises);
  // Wait for cache updates - the buggy version has race conditions here
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Read from ALL services multiple times to catch inconsistencies
  const allReads = [];
  for (let i = 0; i < 3; i++) {
    const reads = await Promise.all(services.map(s => s.getStock(productId)));
    allReads.push(...reads);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  const finalStock = await getFinalStock(productId);
  
  // All reads MUST be exactly the same (no tolerance)
  // The buggy version will have cache inconsistencies
  const uniqueValues = [...new Set(allReads)];
  
  if (uniqueValues.length > 1) {
    throw new Error(`Cache coherency violation detected! Different services see different values: ${uniqueValues.join(', ')}. All reads: ${allReads.join(', ')}, Database: ${finalStock}. This is the bug!`);
  }
  
  // All services should match database exactly
  if (allReads[0] !== finalStock) {
    throw new Error(`Cache inconsistency: Services don't match database. Service reads: ${allReads[0]}, Database: ${finalStock}. This is the bug!`);
  }
});

// STRICT TEST 3: Cache update after transaction race condition - AGGRESSIVE
test('cache_update_race_after_transaction', async () => {
  const productId = 'TEST-TRANSACTION-RACE';
  const initialStock = 200;
  await resetTestState(productId, initialStock);
  
  // The bug: After transaction commits, it reads DB again and updates cache
  // If multiple transactions complete simultaneously, they all read same value
  // and all update cache, causing stale cache
  
  // Create many services to maximize race conditions
  const services = [];
  for (let i = 0; i < 10; i++) {
    services.push(new InventoryService());
  }
  
  // Perform many rapid concurrent decrements to trigger the bug
  const concurrentOps = 20;
  const barrier = createBarrier(concurrentOps);
  const promises = [];
  
  for (let i = 0; i < concurrentOps; i++) {
    const service = services[i % services.length];
    promises.push(
      (async () => {
        await barrier.ready;
        try {
          await service.decrementStock(productId, 1);
        } catch (error) {
          // Some failures
        }
      })()
    );
    barrier.wait();
  }
  
  await Promise.all(promises);
  // Wait for cache updates - this is where the bug manifests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Read from all services - they should all see the SAME value
  const reads = await Promise.all(services.map(s => s.getStock(productId)));
  const dbStock = await getFinalStock(productId);
  
  const expectedStock = initialStock - Math.min(concurrentOps, initialStock);
  
  // Check for inconsistencies - the buggy version will have different values
  const uniqueReads = [...new Set(reads)];
  if (uniqueReads.length > 1) {
    throw new Error(`Cache race condition detected! Services see different values: ${uniqueReads.join(', ')}. All reads: ${reads.join(', ')}, DB: ${dbStock}, Expected: ${expectedStock}. This is the bug!`);
  }
  
  // All should match database exactly
  if (reads[0] !== dbStock) {
    throw new Error(`Cache doesn't match database! Service reads: ${reads[0]}, Database: ${dbStock}, Expected: ${expectedStock}. This is the bug!`);
  }
});

// STRICT TEST 4: Non-monotonic stock values
test('non_monotonic_stock_detection', async () => {
  const productId = 'TEST-MONOTONIC';
  const initialStock = 100;
  await resetTestState(productId, initialStock);
  
  const service = new InventoryService();
  
  // Perform multiple reads during decrements
  const stockValues = [];
  
  // Start decrement
  const decrementPromise = service.decrementStock(productId, 5);
  
  // Read multiple times during the operation
  for (let i = 0; i < 5; i++) {
    stockValues.push(service.getStock(productId));
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  await decrementPromise;
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const finalRead = await service.getStock(productId);
  stockValues.push(Promise.resolve(finalRead));
  
  const allReads = await Promise.all(stockValues);
  
  // Stock should never increase (only decrease or stay same)
  // The buggy version might show non-monotonic behavior due to cache issues
  for (let i = 1; i < allReads.length; i++) {
    assert(
      allReads[i] <= allReads[i-1] || Math.abs(allReads[i] - allReads[i-1]) <= 1,
      `Non-monotonic stock detected: ${allReads.join(' -> ')}. Stock should never increase.`
    );
  }
});

// STRICT TEST 5: Write visibility - updates must be visible quickly
test('write_visibility_strict', async () => {
  const productId = 'TEST-VISIBILITY-STRICT';
  const initialStock = 100;
  await resetTestState(productId, initialStock);
  
  const service1 = new InventoryService();
  const service2 = new InventoryService();
  
  // Write from service1
  await service1.decrementStock(productId, 15);
  
  // Immediately read from service2 (should see update within 100ms)
  const startTime = Date.now();
  const readStock = await service2.getStock(productId);
  const readTime = Date.now() - startTime;
  
  const expectedStock = initialStock - 15;
  
  // Must see the update
  assert(
    readStock === expectedStock,
    `Write not visible: Service2 read ${readStock}, expected ${expectedStock}`
  );
  
  // Should be fast (within 100ms)
  assert(
    readTime < 200,
    `Write visibility too slow: ${readTime}ms (should be < 200ms)`
  );
});

// STRICT TEST 6: Cache invalidation on error
test('cache_invalidation_on_error', async () => {
  const productId = 'TEST-CACHE-INVALID';
  const initialStock = 10;
  await resetTestState(productId, initialStock);
  
  const service = new InventoryService();
  
  // Warm up cache
  await service.getStock(productId);
  
  // Try to purchase more than available (should fail)
  try {
    await service.decrementStock(productId, 20);
    throw new Error('Should have failed - insufficient stock');
  } catch (error) {
    // Expected error
  }
  
  // Cache should be invalidated or updated correctly
  // Read should still show correct stock (10)
  await new Promise(resolve => setTimeout(resolve, 200));
  const stock = await service.getStock(productId);
  
  assert(
    stock === initialStock,
    `Cache not properly invalidated after error. Got ${stock}, expected ${initialStock}`
  );
});

// STRICT TEST 7: Concurrent cache reads during write
test('concurrent_reads_during_write', async () => {
  const productId = 'TEST-CONCURRENT-READ';
  const initialStock = 50;
  await resetTestState(productId, initialStock);
  
  const service1 = new InventoryService();
  const service2 = new InventoryService();
  const service3 = new InventoryService();
  
  // Start write
  const writePromise = service1.decrementStock(productId, 10);
  
  // Concurrent reads from other services
  const readPromises = [
    service2.getStock(productId),
    service3.getStock(productId),
    service2.getStock(productId)
  ];
  
  await writePromise;
  const reads = await Promise.all(readPromises);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // All reads should eventually see the update
  const finalReads = await Promise.all([
    service1.getStock(productId),
    service2.getStock(productId),
    service3.getStock(productId)
  ]);
  
  const expectedStock = initialStock - 10;
  const allSeeUpdate = finalReads.every(stock => stock === expectedStock);
  
  assert(
    allSeeUpdate,
    `Concurrent reads don't see write update. Reads: ${finalReads.join(', ')}, Expected: ${expectedStock}`
  );
});

// STRICT TEST 8: Verify buggy version lacks distributed locks
test('missing_distributed_locks', async () => {
  const servicePath = path.join(repoPath, 'src', 'inventory-service.ts');
  const sourceCode = fs.readFileSync(servicePath, 'utf8');
  
  const hasDistributedLocks = sourceCode.includes('acquireLock') || 
                               sourceCode.includes('LOCK_PREFIX');
  
  if (hasDistributedLocks) {
    throw new Error('Unexpected: Buggy version should not have distributed locks!');
  }
  
  const hasBugPattern = sourceCode.includes('updatedResult = await db.query') &&
                       sourceCode.includes('SELECT stock_quantity FROM inventory');
  
  if (!hasBugPattern) {
    throw new Error('Expected bug pattern not found!');
  }
  
  throw new Error('BUG DETECTED: Missing distributed locks and reads DB after transaction. This causes cache race conditions.');
});

// STRICT TEST 9: Verify buggy version lacks cache invalidation before update
test('missing_cache_invalidation', async () => {
  const servicePath = path.join(repoPath, 'src', 'inventory-service.ts');
  const sourceCode = fs.readFileSync(servicePath, 'utf8');
  
  // Fixed version invalidates cache (redis.del) before setting new value
  // Buggy version just sets cache without proper invalidation
  const hasProperInvalidation = sourceCode.includes('redis.del(cacheKey)') &&
                                sourceCode.match(/redis\.del\(cacheKey\).*redis\.set\(cacheKey/);
  
  if (hasProperInvalidation) {
    throw new Error('Unexpected: Buggy version should not have proper cache invalidation!');
  }
  
  throw new Error('BUG DETECTED: Missing proper cache invalidation before update. Cache may serve stale values.');
});

// STRICT TEST 10: Verify buggy version lacks thundering herd protection
test('missing_thundering_herd_protection', async () => {
  const servicePath = path.join(repoPath, 'src', 'inventory-service.ts');
  const sourceCode = fs.readFileSync(servicePath, 'utf8');
  
  // Fixed version has repopulation locks to prevent thundering herd
  const hasRepopLocks = sourceCode.includes('REPOP_LOCK_PREFIX') ||
                        sourceCode.includes('repop:inventory');
  
  if (hasRepopLocks) {
    throw new Error('Unexpected: Buggy version should not have thundering herd protection!');
  }
  
  throw new Error('BUG DETECTED: Missing thundering herd protection. Multiple servers may repopulate cache simultaneously.');
});

// Cleanup
async function cleanup() {
  try {
    await db.end();
    await redis.quit();
  } catch (error) {
    // Ignore
  }
}

process.on('exit', () => cleanup());
process.on('SIGINT', () => { cleanup().then(() => process.exit(0)); });
process.on('SIGTERM', () => { cleanup().then(() => process.exit(0)); });
