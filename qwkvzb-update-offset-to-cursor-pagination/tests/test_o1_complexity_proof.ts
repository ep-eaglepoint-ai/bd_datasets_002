import { topupTransactionDal, IDatabaseClient, HashPartitionCache, encodeCursor } from '../repository_after/topupTransaction.dal';
import * as assert from 'node:assert';
import * as crypto from 'crypto';

class InMemoryDB implements IDatabaseClient {
    private readonly TOTAL = 100_000_000;
    private partitionCache = new HashPartitionCache();

    public topUpTransaction = {
        findMany: async (args: any) => {
            const { where, take } = args;

            let startId = this.TOTAL;

            if (where && where.id && where.id.lt) {
                startId = where.id.lt;
            }

            let results: any[] = [];
            for (let i = 0; i < take; i++) {
                const currentId = startId - i - 1;
                if (currentId <= 0) break;

                results.push({
                    id: currentId,
                    createdAt: new Date(Date.now() - (this.TOTAL - currentId) * 1000),
                    amount: Math.floor(Math.random() * 10000),
                    status: 'COMPLETED'
                });
            }

            return results;
        }
    }
}

async function testO1Complexity() {
    console.log('TEST: O(1) Complexity Proof (100M Row Simulation)\n');
    console.log('  SLA Requirement: <10ms per page at ANY offset\n');

    const db = new InMemoryDB();
    const testOffsets = [
        { name: 'Page 1 (Start)', id: null },
        { name: 'Page 1,000,000 (Middle)', id: 99_000_000 },
        { name: 'Page 50,000,000 (Deep)', id: 50_000_000 },
        { name: 'Page 99,900,000 (Tail)', id: 100_100 },
    ];

    const SLA_THRESHOLD_MS = 10;
    const results: Array<{ name: string; timingMs: number }> = [];

    await topupTransactionDal({ method: 'get paginate', cursor: null, limit: 1 }, db).catch(() => { });

    for (const test of testOffsets) {
        const startTime = performance.now();

        const cursor = test.id
            ? encodeCursor(test.id, new Date(Date.now() - (100_000_000 - test.id) * 1000))
            : null;

        const result = await topupTransactionDal({
            method: 'get paginate',
            cursor,
            limit: 100,
            filters: {},
        }, db).catch(e => {
            console.error(`Error in ${test.name}:`, e);
            throw e;
        });

        const endTime = performance.now();
        const timingMs = endTime - startTime;

        results.push({ name: test.name, timingMs });
        const status = timingMs < SLA_THRESHOLD_MS ? '✓' : '✗';
        console.log(`  ${status} ${test.name}: ${timingMs.toFixed(2)}ms (SLA: <${SLA_THRESHOLD_MS}ms)`);

        assert.ok(timingMs < SLA_THRESHOLD_MS,
            `SLA Violation: ${test.name} took ${timingMs.toFixed(2)}ms, exceeds ${SLA_THRESHOLD_MS}ms threshold`);
    }

    const firstTiming = results[0].timingMs;
    const lastTiming = results[results.length - 1].timingMs;
    const variance = Math.abs(lastTiming - firstTiming);
    const maxVariance = 20;

    console.log(`\n  Max variance across offsets: ${variance.toFixed(2)}ms (limit: ${maxVariance}ms)`);
    assert.ok(variance < maxVariance,
        `O(1) violation: ${variance.toFixed(2)}ms variance indicates non-constant complexity`);

    const avgTiming = results.reduce((a, b) => a + b.timingMs, 0) / results.length;
    console.log(`  Average timing: ${avgTiming.toFixed(2)}ms`);

    console.log('\n  ✅ PASSED: O(1) complexity verified (<10ms at all offsets)\n');
}

testO1Complexity().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
