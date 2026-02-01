import { topupTransactionDal, encodeCursor, decodeCursor, IDatabaseClient } from '../repository_after/topupTransaction.dal';
import * as assert from 'node:assert';

class MockDB implements IDatabaseClient {
    public callCount = 0;

    public topUpTransaction = {
        findMany: async (args: any) => {
            this.callCount++;
            const results = [];
            for (let i = 0; i < (args.take || 10); i++) {
                results.push({
                    id: 100 - i,
                    createdAt: new Date(),
                    amount: 500,
                    status: 'COMPLETED'
                });
            }
            return results;
        }
    };
}

async function testCursorValidation() {
    console.log('TEST: O(1) Cursor Validation (No DB Lookup)\n');

    const db = new MockDB();

    console.log('  Test 1: Malformed cursor (invalid base64)');
    const initialCalls = db.callCount;

    const result1 = await topupTransactionDal({
        method: 'get paginate',
        cursor: 'invalid!!!base64',
        limit: 10,
        filters: {},
    }, db);

    assert.strictEqual(result1.statusCode, 400, 'Malformed cursor should return 400');
    assert.ok(result1.body.error, 'Should contain error message');
    assert.strictEqual(db.callCount, initialCalls, 'Should NOT query DB for invalid cursor');
    console.log('  ✅ Rejected without DB lookup\n');

    console.log('  Test 2: Valid base64 but invalid JSON');
    const beforeCalls2 = db.callCount;

    const result2 = await topupTransactionDal({
        method: 'get paginate',
        cursor: Buffer.from('not valid json').toString('base64'),
        limit: 10,
        filters: {},
    }, db);

    assert.strictEqual(result2.statusCode, 400, 'Invalid JSON cursor should return 400');
    assert.strictEqual(db.callCount, beforeCalls2, 'Should NOT query DB for invalid cursor');
    console.log('  ✅ Rejected without DB lookup\n');

    console.log('  Test 3: Valid JSON but tampered signature');
    const beforeCalls3 = db.callCount;

    const tamperedCursor = {
        id: 12345,
        createdAt: Date.now(),
        tieBreakHash: '0'.repeat(64),
        sig: 'TAMPERED_SIG_0000000000000000000000000000000000000000000000',
    };

    const result3 = await topupTransactionDal({
        method: 'get paginate',
        cursor: Buffer.from(JSON.stringify(tamperedCursor)).toString('base64'),
        limit: 10,
        filters: {},
    }, db);

    assert.strictEqual(result3.statusCode, 400, 'Tampered signature should return 400');
    assert.strictEqual(db.callCount, beforeCalls3, 'Should NOT query DB for tampered cursor');
    console.log('  ✅ Rejected without DB lookup\n');

    console.log('  Test 4: Valid JSON but tampered tieBreakHash');
    const beforeCalls4 = db.callCount;

    const validCursor = encodeCursor(100, new Date('2026-01-20T12:00:00Z'));
    const decoded = JSON.parse(Buffer.from(validCursor, 'base64').toString('utf8'));

    decoded.tieBreakHash = 'a'.repeat(64);
    const tamperedHashCursor = Buffer.from(JSON.stringify(decoded)).toString('base64');

    const result4 = await topupTransactionDal({
        method: 'get paginate',
        cursor: tamperedHashCursor,
        limit: 10,
        filters: {},
    }, db);

    assert.strictEqual(result4.statusCode, 400, 'Tampered tieBreakHash should return 400');
    assert.strictEqual(db.callCount, beforeCalls4, 'Should NOT query DB for tampered cursor');
    console.log('  ✅ Rejected without DB lookup\n');

    console.log('  Test 5: Valid cursor should succeed');
    const beforeCalls5 = db.callCount;

    const result5 = await topupTransactionDal({
        method: 'get paginate',
        cursor: validCursor,
        limit: 10,
        filters: {},
    }, db);

    assert.strictEqual(result5.statusCode, 200, 'Valid cursor should return 200');
    assert.strictEqual(db.callCount, beforeCalls5 + 1, 'Should query DB for valid cursor');
    console.log('  ✅ Accepted and queried DB\n');

    console.log('  Test 6: O(1) Validation Performance');

    const ITERATIONS = 100;
    const invalidCursors = [
        'invalid',
        Buffer.from('not json').toString('base64'),
        Buffer.from(JSON.stringify({ id: 1, sig: 'bad' })).toString('base64'),
    ];

    const start = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        await topupTransactionDal({
            method: 'get paginate',
            cursor: invalidCursors[i % invalidCursors.length],
            limit: 1,
            filters: {},
        }, db);
    }
    const end = performance.now();

    const avgTime = (end - start) / ITERATIONS;
    console.log(`    Average validation time: ${avgTime.toFixed(3)}ms`);

    assert.ok(avgTime < 1, 'Validation should be O(1) and extremely fast (<1ms)');
    console.log('  ✅ O(1) performance verified\n');

    console.log('  ==========================================');
    console.log('  CURSOR VALIDATION SUMMARY');
    console.log('  ==========================================');
    console.log('  ✓ Malformed base64: Rejected without DB');
    console.log('  ✓ Invalid JSON: Rejected without DB');
    console.log('  ✓ Tampered signature: Rejected without DB');
    console.log('  ✓ Tampered tieBreakHash: Rejected without DB');
    console.log('  ✓ Valid cursor: Accepted and processed');
    console.log(`  ✓ Performance: ${avgTime.toFixed(3)}ms avg (<1ms)`);

    console.log('\n  ✅ PASSED: O(1) cursor validation verified\n');
}

testCursorValidation().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
