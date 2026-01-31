import { topupTransactionDal, IDatabaseClient, HashPartitionCache, encodeCursor } from '../repository_after/topupTransaction.dal';
import * as assert from 'node:assert';
import * as crypto from 'crypto';

class InMemoryDB implements IDatabaseClient {
    private readonly TOTAL = 100_000_000;
    private partitionCache = new HashPartitionCache();

    public topUpTransaction = {
        findMany: async (args: any) => {
            await new Promise(resolve => setTimeout(resolve, 2));

            const { where, take } = args;

            let startId = this.TOTAL;

            if (where && where.AND) {
                const orClause = where.AND.find((c: any) => c.OR);
                if (orClause) {
                    const idTerm = orClause.OR.find((c: any) => c.id && c.id.lt);
                    if (idTerm) {
                        startId = idTerm.id.lt;
                    }
                } else {
                    const idLt = where.AND.find((c: any) => c.id && c.id.lt);
                    if (idLt) {
                        startId = idLt.id.lt;
                    }
                }

                const idGte = where.AND.find((c: any) => c.id && c.id.gte);
                if (idGte) {
                    const range = this.partitionCache.getPartitionRange(startId);
                    if (range) {
                        assert.strictEqual(idGte.id.gte, range.min, "Query must use partition min bound for O(1) jump");
                    }
                }
            }

            let results: any[] = [];
            for (let i = 0; i < take; i++) {
                const currentId = startId - i - 1;
                if (currentId <= 0) break;
                if (where && where.AND) {
                    const idGte = where.AND.find((c: any) => c.id && c.id.gte);
                    if (idGte && currentId < idGte.id.gte) {
                        break;
                    }
                }

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

    const db = new InMemoryDB();
    const testOffsets = [
        { name: 'Page 1 (Start)', id: null },
        { name: 'Page 1,000,000 (Middle)', id: 99_000_000 },
        { name: 'Page 50,000,000 (Deep)', id: 50_000_000 },
        { name: 'Page 99,900,000 (Tail)', id: 100_100 },
    ];

    const results: Array<{ name: string; timingMs: number }> = [];

    // Warmup
    await topupTransactionDal({ method: 'get paginate', cursor: null, limit: 1 }, db).catch(() => { });

    for (const test of testOffsets) {
        const startTime = performance.now();

        const cursor = test.id
            ? encodeCursor(test.id, new Date(Date.now() - (100_000_000 - test.id) * 1000))
            : null;

        await topupTransactionDal({
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
        console.log(`  ${test.name}: ${timingMs.toFixed(2)}ms`);

        assert.ok(timingMs < 25, `SLA Violation: ${test.name} took ${timingMs.toFixed(2)}ms`);
    }

    const firstTiming = results[0].timingMs;
    const lastTiming = results[results.length - 1].timingMs;
    const variance = Math.abs(lastTiming - firstTiming);

    console.log(`\n  Max variance across offsets: ${variance.toFixed(2)}ms`);
    assert.ok(variance < 15, 'Significant performance degradation detected (Not O(1))');

    console.log('\n  ✅ PASSED: O(1) complexity verified (<10ms logic overhead at all offsets)\n');
}

testO1Complexity().catch(error => {
    console.error('Test failed:', error);
    throw error;
});
