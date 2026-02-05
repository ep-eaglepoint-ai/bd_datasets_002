import { topupTransactionDal, encodeCursor, SimulatedSphincsPlusSignature, IDatabaseClient } from '../repository_after/topupTransaction.dal';
import * as assert from 'node:assert';

class MockDB implements IDatabaseClient {
    private readonly data = [
        { id: 100, createdAt: new Date('2026-01-15T10:00:00Z'), amount: 500, status: 'COMPLETED' },
        { id: 99, createdAt: new Date('2026-01-15T10:00:00Z'), amount: 300, status: 'COMPLETED' },
        { id: 98, createdAt: new Date('2026-01-14T09:00:00Z'), amount: 200, status: 'COMPLETED' },
        { id: 97, createdAt: new Date('2026-01-14T09:00:00Z'), amount: 150, status: 'COMPLETED' },
        { id: 96, createdAt: new Date('2026-01-13T08:00:00Z'), amount: 100, status: 'COMPLETED' },
    ];

    public topUpTransaction = {
        findMany: async (args: any) => {
            let results = [...this.data];

            if (args.where && args.where.id && args.where.id.lt) {
                results = results.filter(r => r.id < args.where.id.lt);
            }

            return results.slice(0, args.take || 10);
        }
    };
}

async function testDeterministicOrdering() {
    console.log('TEST: Deterministic Ordering with Quantum-Safe Hash Tie-Breaking\n');

    const db = new MockDB();
    const sphincs = new SimulatedSphincsPlusSignature();
    const RUNS = 10;
    const results: any[][] = [];

    console.log(`  Running ${RUNS} identical queries to verify determinism...`);

    for (let i = 0; i < RUNS; i++) {
        const result = await topupTransactionDal({
            method: 'get paginate',
            cursor: null,
            limit: 20,
            filters: {},
        }, db);

        assert.strictEqual(result.statusCode, 200, `Run ${i + 1} failed`);
        results.push(result.body.data || []);
    }

    const firstRunData = JSON.stringify(results[0].map((r: any) => ({ id: r.id, createdAt: r.createdAt })));
    for (let i = 1; i < RUNS; i++) {
        const runData = JSON.stringify(results[i].map((r: any) => ({ id: r.id, createdAt: r.createdAt })));
        assert.strictEqual(runData, firstRunData, `Run ${i + 1} results differ from run 1`);
    }

    console.log(`  ✅ All ${RUNS} runs returned identical results`);

    console.log('\n  Verifying id DESC ordering...');
    const data = results[0];
    for (let i = 1; i < data.length; i++) {
        assert.ok(data[i].id < data[i - 1].id,
            `Ordering violation: id ${data[i].id} should be less than ${data[i - 1].id}`);
    }
    console.log('  ✅ Records are ordered by id DESC');

    console.log('\n  Verifying quantum-safe hash tie-break documentation...');
    const result = await topupTransactionDal({
        method: 'get paginate',
        cursor: null,
        limit: 5,
        filters: {},
    }, db);

    assert.ok(result.body._performance, 'Missing _performance metadata');
    assert.ok(result.body._performance.tieBreakMethod, 'Missing tieBreakMethod in performance');
    assert.ok(result.body._performance.tieBreakMethod.includes('quantum-safe'),
        'Tie-break method should mention quantum-safe hash');

    console.log(`  ✅ Tie-break method: ${result.body._performance.tieBreakMethod}`);

    console.log('\n  Verifying hash generation determinism...');
    const testId = 12345;
    const testDate = new Date('2026-01-20T12:00:00Z');
    const hash1 = sphincs.generateTieBreakHash(testId, testDate);
    const hash2 = sphincs.generateTieBreakHash(testId, testDate);
    assert.strictEqual(hash1, hash2, 'Hash generation is not deterministic');
    console.log(`  ✅ Hash for (${testId}, ${testDate.toISOString()}): ${hash1.slice(0, 16)}...`);

    console.log('\n  Verifying audit trail includes ordering method...');
    assert.ok(result.body._audit.orderingMethod, 'Missing orderingMethod in audit');
    assert.ok(result.body._audit.orderingMethod.includes('id DESC'),
        'Ordering method should specify id DESC');
    console.log(`  ✅ Ordering method: ${result.body._audit.orderingMethod}`);

    console.log('\n  ✅ PASSED: Deterministic ordering with quantum-safe hash verified\n');
}

testDeterministicOrdering().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
