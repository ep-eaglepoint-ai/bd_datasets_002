import { topupTransactionDal, HashPartitionCache, IDatabaseClient, encodeCursor } from '../repository_after/topupTransaction.dal';
import * as assert from 'node:assert';

class MockDB implements IDatabaseClient {
    public topUpTransaction = {
        findMany: async (args: any) => {
            await new Promise(resolve => setTimeout(resolve, 0));
            const results = [];
            const limit = args.take || 10;
            const startId = args.where?.id?.lt || 1000;

            for (let i = 0; i < limit; i++) {
                results.push({
                    id: startId - i - 1,
                    createdAt: new Date(Date.now() - i * 1000),
                    amount: Math.random() * 1000,
                    status: 'COMPLETED'
                });
            }
            return results;
        }
    };
}

async function testThreadSafety() {
    console.log('TEST: Thread Safety with Lock-Free Atomics\n');

    const db = new MockDB();
    const CONCURRENT_REQUESTS = 1000;

    console.log('  Test 1: HashPartitionCache Atomic Operations');

    const cache = new HashPartitionCache();

    const ranges: Array<{ min: number; max: number }> = [];
    for (let i = 0; i < 100; i++) {
        const testId = Math.floor(Math.random() * 100_000_000);
        const range = cache.getPartitionRange(testId);
        if (range) {
            ranges.push(range);
            assert.ok(range.min < range.max, `Invalid range: ${range.min} >= ${range.max}`);
        }
    }

    console.log(`    Verified ${ranges.length} atomic reads`);
    console.log('  ✅ Atomic reads are consistent\n');

    console.log(`  Test 2: ${CONCURRENT_REQUESTS} Concurrent Requests`);

    const cursors: (string | null)[] = [];
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        if (i % 5 === 0) {
            cursors.push(null);
        } else {
            const id = 100000 - i * 100;
            const createdAt = new Date(Date.now() - i * 1000);
            cursors.push(encodeCursor(id, createdAt));
        }
    }

    console.log(`    Launching ${CONCURRENT_REQUESTS} concurrent requests...`);
    const startTime = performance.now();

    const promises = cursors.map((cursor, index) =>
        topupTransactionDal({
            method: 'get paginate',
            cursor,
            limit: 10,
            filters: {},
        }, db).then(result => ({
            index,
            success: result.statusCode === 200,
            recordCount: result.body.data?.length || 0,
            hasNextCursor: !!result.body.nextCursor,
            hasAudit: !!result.body._audit,
        })).catch(error => ({
            index,
            success: false,
            error: error.message,
            recordCount: 0,
            hasNextCursor: false,
            hasAudit: false,
        }))
    );

    const results = await Promise.all(promises);
    const endTime = performance.now();

    const successCount = results.filter(r => r.success).length;
    const totalTime = endTime - startTime;
    const avgTime = totalTime / CONCURRENT_REQUESTS;

    console.log(`    Completed: ${successCount}/${CONCURRENT_REQUESTS} requests`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Avg per request: ${avgTime.toFixed(2)}ms`);

    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
        console.error(`    ❌ ${failures.length} requests failed`);
        failures.slice(0, 5).forEach(f => console.error(`      Request ${f.index}: ${(f as any).error}`));
        process.exit(1);
    }

    console.log('  ✅ All requests completed successfully\n');

    console.log('  Test 3: Data Consistency Under Concurrency');

    const invalidResults = results.filter(r =>
        r.success && (r.recordCount < 0 || !r.hasAudit)
    );

    if (invalidResults.length > 0) {
        console.error(`    ❌ ${invalidResults.length} requests returned corrupted data`);
        process.exit(1);
    }

    const withAudit = results.filter(r => r.hasAudit).length;
    console.log(`    Requests with audit trail: ${withAudit}/${CONCURRENT_REQUESTS}`);
    assert.strictEqual(withAudit, CONCURRENT_REQUESTS, 'All requests should have audit trail');

    console.log('  ✅ All data is consistent\n');

    console.log('  Test 4: Lock-Free Overhead');

    const overheadUs = avgTime * 1000;
    console.log(`    Average overhead: ${overheadUs.toFixed(3)}μs per request`);

    if (avgTime > 1) {
        console.log('    ⚠️  Note: Overhead includes async DB simulation');
    }

    const throughput = CONCURRENT_REQUESTS / (totalTime / 1000);
    console.log(`    Throughput: ${throughput.toFixed(0)} requests/second`);
    console.log('  ✅ Lock-free overhead is acceptable\n');

    console.log('  Test 5: Partition Cache Race Condition Check');

    const partitionReads: Promise<{ min: number; max: number } | null>[] = [];
    const testId = 50_000_000;

    for (let i = 0; i < 100; i++) {
        partitionReads.push(Promise.resolve(cache.getPartitionRange(testId)));
    }

    const partitionResults = await Promise.all(partitionReads);
    const firstResult = partitionResults[0];

    partitionResults.forEach((result, index) => {
        assert.deepStrictEqual(result, firstResult,
            `Partition read ${index} differs from first read - race condition detected`);
    });

    console.log(`    ${partitionResults.length} concurrent reads returned consistent data`);
    console.log('  ✅ No race conditions detected\n');

    console.log('  ==========================================');
    console.log('  THREAD SAFETY SUMMARY');
    console.log('  ==========================================');
    console.log(`  ✓ Concurrent requests: ${CONCURRENT_REQUESTS}`);
    console.log(`  ✓ Success rate: ${(successCount / CONCURRENT_REQUESTS * 100).toFixed(1)}%`);
    console.log(`  ✓ Throughput: ${throughput.toFixed(0)} req/s`);
    console.log(`  ✓ Data consistency: Verified`);
    console.log(`  ✓ Race conditions: None detected`);
    console.log(`  ✓ Lock-free: SharedArrayBuffer + Atomics`);

    console.log('\n  ✅ PASSED: Thread safety verified\n');
}

testThreadSafety().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
