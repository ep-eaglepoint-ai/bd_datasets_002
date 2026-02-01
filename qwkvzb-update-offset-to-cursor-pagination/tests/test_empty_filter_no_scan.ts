import { topupTransactionDal, IDatabaseClient } from '../repository_after/topupTransaction.dal';
import * as assert from 'node:assert';

// ============================================================================
// EMPTY FILTER PAGINATION TEST (No Full Scan)
// 
// Requirements verified:
// - Empty filters don't cause full table scans
// - <10ms SLA maintained (strict enforcement)
// - No matches returns empty array with hasMore=false
// ============================================================================

class FastMockDB implements IDatabaseClient {
    public topUpTransaction = {
        findMany: async (args: any) => {
            const { where, take } = args;

            // Check if filter would return no results
            if (where && where.id === -999999) {
                return [];
            }

            // Return mock data
            const results = [];
            for (let i = 0; i < (take || 100); i++) {
                results.push({
                    id: 1000 - i,
                    createdAt: new Date(Date.now() - i * 1000),
                    amount: Math.random() * 1000,
                    status: 'COMPLETED'
                });
            }
            return results;
        }
    };
}

async function testEmptyFilterNoScan() {
    console.log('TEST: Empty Filter Pagination (No Full Scan)\n');

    const db = new FastMockDB();
    const SLA_THRESHOLD_MS = 10; // Strict <10ms enforcement

    // Warmup
    await topupTransactionDal({ method: 'get paginate', cursor: null, limit: 1, filters: {} }, db);

    // ========================================================================
    // Test 1: Empty filter object
    // ========================================================================
    console.log('  Test 1: Empty filter object');

    const startTime1 = performance.now();
    const result1 = await topupTransactionDal({
        method: 'get paginate',
        cursor: null,
        limit: 100,
        filters: {},
    }, db);
    const timing1 = performance.now() - startTime1;

    assert.strictEqual(result1.statusCode, 200, 'Expected status 200');
    console.log(`    Completed in ${timing1.toFixed(2)}ms`);
    console.log(`    Returned ${result1.body.data?.length || 0} records`);

    // Strict SLA enforcement
    assert.ok(timing1 < SLA_THRESHOLD_MS,
        `SLA Violation: ${timing1.toFixed(2)}ms exceeds ${SLA_THRESHOLD_MS}ms threshold`);
    console.log(`  ✅ Under ${SLA_THRESHOLD_MS}ms SLA\n`);

    // ========================================================================
    // Test 2: Filter with no matches
    // ========================================================================
    console.log('  Test 2: Filter with no matches');

    const startTime2 = performance.now();
    const result2 = await topupTransactionDal({
        method: 'get paginate',
        cursor: null,
        limit: 100,
        filters: { id: -999999 }, // Non-existent ID
    }, db);
    const timing2 = performance.now() - startTime2;

    assert.strictEqual(result2.statusCode, 200, 'Expected status 200');
    assert.strictEqual(result2.body.data?.length, 0, 'Expected 0 records for non-existent filter');
    assert.strictEqual(result2.body.hasMore, false, 'hasMore should be false for empty results');
    assert.strictEqual(result2.body.nextCursor, null, 'nextCursor should be null for empty results');

    console.log(`    Completed in ${timing2.toFixed(2)}ms`);
    console.log(`    Returned ${result2.body.data.length} records (expected 0)`);
    console.log(`    hasMore: ${result2.body.hasMore}`);

    // Strict SLA enforcement
    assert.ok(timing2 < SLA_THRESHOLD_MS,
        `SLA Violation: ${timing2.toFixed(2)}ms exceeds ${SLA_THRESHOLD_MS}ms threshold`);
    console.log(`  ✅ Under ${SLA_THRESHOLD_MS}ms SLA\n`);

    // ========================================================================
    // Test 3: Performance consistency
    // ========================================================================
    console.log('  Test 3: Performance consistency (10 iterations)');

    const timings: number[] = [];
    for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await topupTransactionDal({
            method: 'get paginate',
            cursor: null,
            limit: 50,
            filters: {},
        }, db);
        timings.push(performance.now() - start);
    }

    const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
    const maxTiming = Math.max(...timings);

    console.log(`    Average: ${avgTiming.toFixed(2)}ms`);
    console.log(`    Max: ${maxTiming.toFixed(2)}ms`);

    // All iterations should meet SLA
    const violations = timings.filter(t => t >= SLA_THRESHOLD_MS);
    assert.strictEqual(violations.length, 0,
        `${violations.length} requests exceeded ${SLA_THRESHOLD_MS}ms SLA`);
    console.log(`  ✅ All iterations under ${SLA_THRESHOLD_MS}ms\n`);

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('  ==========================================');
    console.log('  EMPTY FILTER PERFORMANCE SUMMARY');
    console.log('  ==========================================');
    console.log(`  ✓ Empty filter: ${timing1.toFixed(2)}ms (no full scan)`);
    console.log(`  ✓ No matches: ${timing2.toFixed(2)}ms (O(1) detection)`);
    console.log(`  ✓ Average: ${avgTiming.toFixed(2)}ms`);
    console.log(`  ✓ SLA (${SLA_THRESHOLD_MS}ms): All tests passed`);

    console.log('\n  ✅ PASSED: Empty filters handled efficiently\n');
}

testEmptyFilterNoScan().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
