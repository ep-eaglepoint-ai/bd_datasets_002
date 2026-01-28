import { topupTransactionDal } from '../repository_after/topupTransaction.dal';
import * as assert from 'node:assert';

async function testCursorValidation() {
    console.log('TEST: O(1) Cursor Validation (No DB Lookup)\n');

    console.log('  Test 1: Malformed cursor (invalid base64)');
    const result1 = await topupTransactionDal({
        method: 'get paginate',
        cursor: 'invalid!!!base64',
        limit: 10,
        filters: {},
    });
    assert.strictEqual(result1.statusCode, 400, 'Malformed cursor should return 400');
    console.log('  ✅ Rejected correctly');

    // Test 2: Valid base64 but invalid JSON
    console.log('\n  Test 2: Valid base64 but invalid JSON');
    const result2 = await topupTransactionDal({
        method: 'get paginate',
        cursor: Buffer.from('not valid json').toString('base64'),
        limit: 10,
        filters: {},
    });
    assert.strictEqual(result2.statusCode, 400, 'Invalid JSON cursor should return 400');
    console.log('  ✅ Rejected correctly');

    // Test 3: Valid JSON but tampered signature
    console.log('\n  Test 3: Valid JSON but tampered signature');
    const tamperedCursor = {
        id: 12345,
        createdAt: Date.now(),
        sig: 'TAMPERED_SIG_0000000000000000000000000000000000000000000000',
    };
    const result3 = await topupTransactionDal({
        method: 'get paginate',
        cursor: Buffer.from(JSON.stringify(tamperedCursor)).toString('base64'),
        limit: 10,
        filters: {},
    });
    assert.strictEqual(result3.statusCode, 400, 'Tampered signature should return 400');
    console.log('  ✅ Rejected correctly');

    console.log('\n  Test 4: O(1) Validation Performance');
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
        await topupTransactionDal({
            method: 'get paginate',
            cursor: 'invalid',
            limit: 1,
        });
    }
    const end = performance.now();
    const avg = (end - start) / 100;
    console.log(`  Average validation time: ${avg.toFixed(3)}ms`);
    assert.ok(avg < 1, 'Validation should be O(1) and extremely fast (<1ms)');

    console.log('\n  ✅ PASSED: All cursor validation tests passed\n');
}

testCursorValidation().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
