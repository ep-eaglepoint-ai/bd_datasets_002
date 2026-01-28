import { topupTransactionDal } from '../repository_after/topupTransaction.dal';

async function testEmptyFilterNoScan() {
    console.log(' TEST: Empty Filter Pagination (No Full Scan)\\n');
    console.log('  Test 1: Empty filter object');

    await topupTransactionDal({ method: 'get paginate', cursor: null, limit: 1, filters: {} });

    const startTime1 = performance.now();
    const result1 = await topupTransactionDal({
        method: 'get paginate',
        cursor: null,
        limit: 100,
        filters: {}, 
    });
    const timing1 = performance.now() - startTime1;

    if (result1.statusCode !== 200) {
        console.error(`  ❌ FAILED: Status ${result1.statusCode}`);
        process.exit(1);
    }

    console.log(`  ✅ Completed in ${timing1.toFixed(2)}ms`);
    console.log(`     Returned ${result1.body.data?.length || 0} records`);

    if (timing1 > 25) {
        console.error(`  ❌ FAILED: Exceeded 25ms (indicates full scan)`);
        process.exit(1);
    } else if (timing1 > 10) {
        console.warn(`  ⚠️  Warning: Request took ${timing1.toFixed(2)}ms (SLA: 10ms target)`);
    }

    console.log('\\n  Test 2: Filter with no matches');
    const startTime2 = performance.now();
    const result2 = await topupTransactionDal({
        method: 'get paginate',
        cursor: null,
        limit: 100,
        filters: { id: -999999 }, // Non-existent ID
    });
    const timing2 = performance.now() - startTime2;

    if (result2.statusCode !== 200) {
        console.error(`  ❌ FAILED: Status ${result2.statusCode}`);
        process.exit(1);
    }

    console.log(`  ✅ Completed in ${timing2.toFixed(2)}ms`);
    console.log(`     Returned ${result2.body.data?.length || 0} records (expected 0)`);
    console.log(`     hasMore: ${result2.body.hasMore}`);

    if (result2.body.data?.length !== 0) {
        console.error(`  ❌ FAILED: Expected 0 records for non-existent filter`);
        process.exit(1);
    }

    if (result2.body.hasMore !== false) {
        console.error(`  ❌ FAILED: hasMore should be false for empty results`);
        process.exit(1);
    }

    if (result2.body.nextCursor !== null) {
        console.error(`  ❌ FAILED: nextCursor should be null for empty results`);
        process.exit(1);
    }

    if (timing2 > 25) {
        console.error(`  ❌ FAILED: Empty result took >25ms`);
        process.exit(1);
    } else if (timing2 > 10) {
        console.warn(`  ⚠️  Warning: Empty result took ${timing2.toFixed(2)}ms`);
    }

    console.log('\\n  Performance analysis:');
    console.log(`  Empty filter: ${timing1.toFixed(2)}ms (no full scan)`);
    console.log(`  No matches: ${timing2.toFixed(2)}ms (O(1) detection)`);

    console.log('\\n  ✅ PASSED: Empty filters handled efficiently\\n');
}

testEmptyFilterNoScan().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
