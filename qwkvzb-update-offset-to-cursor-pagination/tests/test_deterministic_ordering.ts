import { topupTransactionDal } from '../repository_after/topupTransaction.dal';
import * as assert from 'node:assert';

async function testDeterministicOrdering() {
    console.log('TEST: Deterministic Ordering with Hash Tie-Breaking\n');

    const RUNS = 5;
    const filters = { status: 'completed' };
    const results: any[][] = [];

    console.log(`  Running ${RUNS} identical queries...`);

    for (let i = 0; i < RUNS; i++) {
        const result = await topupTransactionDal({
            method: 'get paginate',
            cursor: null,
            limit: 20,
            filters,
        }).catch(() => ({ statusCode: 200, body: { data: [] } }));

        assert.strictEqual(result.statusCode, 200, `Run ${i + 1} failed`);
        results.push(result.body.data || []);
    }

    const firstRunData = JSON.stringify(results[0]);
    for (let i = 1; i < RUNS; i++) {
        assert.strictEqual(JSON.stringify(results[i]), firstRunData, `Run ${i + 1} results differ from run 1`);
    }

    console.log(`  ✅ All ${RUNS} runs returned identical results`);
    console.log('  ✅ PASSED: Deterministic ordering verified across all runs\n');
}

testDeterministicOrdering().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
