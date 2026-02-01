import { topupTransactionDal, IDatabaseClient } from '../repository_after/topupTransaction.dal';
import * as assert from 'node:assert';

// ============================================================================
// PRODUCTION EDGE CASES TEST
// 
// Requirements verified:
// - Boundary value handling
// - Malformed data sanitization
// - Missing parameter defaults
// - Concurrent access safety
// - Attack vector protection
// ============================================================================

class MockDB implements IDatabaseClient {
    public topUpTransaction = {
        findMany: async (args: any) => {
            const { take } = args;
            const limit = Math.max(0, Math.min(take || 100, 1000)); // Enforce max 1000

            const results = [];
            for (let i = 0; i < limit; i++) {
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

async function testProductionEdgeCases() {
    console.log('TEST: Production Edge Cases\n');

    const db = new MockDB();

    // ========================================================================
    // Edge Case 1: Extreme limit values
    // ========================================================================
    console.log('  Edge Case 1: Extreme limit values');

    // Zero limit
    const result0 = await topupTransactionDal({
        method: 'get paginate',
        cursor: null,
        limit: 0,
        filters: {},
    }, db);
    console.log(`    Zero limit: status=${result0.statusCode}, records=${result0.body.data?.length || 0}`);
    assert.strictEqual(result0.statusCode, 200, 'Zero limit should return 200');

    // Negative limit
    const resultNeg = await topupTransactionDal({
        method: 'get paginate',
        cursor: null,
        limit: -5,
        filters: {},
    }, db);
    console.log(`    Negative limit: status=${resultNeg.statusCode}, records=${resultNeg.body.data?.length || 0}`);
    assert.strictEqual(resultNeg.statusCode, 200, 'Negative limit should be handled');

    // Very large limit
    const resultLarge = await topupTransactionDal({
        method: 'get paginate',
        cursor: null,
        limit: 1000000,
        filters: {},
    }, db);
    console.log(`    Large limit (1M): status=${resultLarge.statusCode}, records=${resultLarge.body.data?.length || 0}`);
    assert.strictEqual(resultLarge.statusCode, 200, 'Large limit should be handled');

    console.log('  ✅ Extreme limits handled\n');

    // ========================================================================
    // Edge Case 2: Malformed filters
    // ========================================================================
    console.log('  Edge Case 2: Malformed filters');

    const resultInvalidField = await topupTransactionDal({
        method: 'get paginate',
        cursor: null,
        limit: 10,
        filters: { invalidField: 'test' },
    }, db);
    console.log(`    Invalid filter field: status=${resultInvalidField.statusCode}`);
    assert.strictEqual(resultInvalidField.statusCode, 200, 'Invalid field should not crash');

    console.log('  ✅ Malformed filters handled\n');

    // ========================================================================
    // Edge Case 3: Missing parameters
    // ========================================================================
    console.log('  Edge Case 3: Missing parameters');

    const resultMissing = await topupTransactionDal({
        method: 'get paginate',
    } as any, db);
    console.log(`    Missing params: status=${resultMissing.statusCode}`);
    assert.strictEqual(resultMissing.statusCode, 200, 'Missing params should use defaults');
    assert.ok(resultMissing.body.data, 'Should have data array');

    console.log('  ✅ Missing params use defaults\n');

    // ========================================================================
    // Edge Case 4: Null/undefined values
    // ========================================================================
    console.log('  Edge Case 4: Null/undefined values');

    const resultNull = await topupTransactionDal({
        method: 'get paginate',
        cursor: undefined,
        limit: null as any,
        filters: null as any,
    }, db);
    console.log(`    Null values: status=${resultNull.statusCode}`);
    assert.strictEqual(resultNull.statusCode, 200, 'Null values should be sanitized');

    console.log('  ✅ Null values sanitized\n');

    // ========================================================================
    // Edge Case 5: Concurrent pagination
    // ========================================================================
    console.log('  Edge Case 5: Concurrent pagination');

    const concurrentPromises = Array.from({ length: 10 }, () =>
        topupTransactionDal({
            method: 'get paginate',
            cursor: null,
            limit: 5,
            filters: {},
        }, db)
    );

    const concurrentResults = await Promise.all(concurrentPromises);
    const allSucceeded = concurrentResults.every(r => r.statusCode === 200);
    assert.ok(allSucceeded, 'All concurrent requests should succeed');
    console.log(`    10 concurrent requests: All succeeded`);

    // Verify deterministic results
    const firstIds = concurrentResults.map(r => r.body.data?.[0]?.id);
    const allSame = firstIds.every(id => id === firstIds[0]);
    assert.ok(allSame, 'Concurrent requests should return same results');
    console.log(`    Deterministic: All got same first ID (${firstIds[0]})`);

    console.log('  ✅ Concurrent access safe\n');

    // ========================================================================
    // Edge Case 6: Unsupported method
    // ========================================================================
    console.log('  Edge Case 6: Unsupported method');

    try {
        await topupTransactionDal({
            method: 'invalid method',
            cursor: null,
            limit: 10,
            filters: {},
        } as any, db);
        assert.fail('Should reject invalid method');
    } catch (error: any) {
        assert.ok(error.message.includes('Unsupported method'), 'Should throw with method info');
        console.log(`    Invalid method: Rejected correctly`);
    }

    console.log('  ✅ Invalid methods rejected\n');

    // ========================================================================
    // Edge Case 7: Extremely long cursor
    // ========================================================================
    console.log('  Edge Case 7: Extremely long cursor');

    const longCursor = 'A'.repeat(10000);
    const longCursorResult = await topupTransactionDal({
        method: 'get paginate',
        cursor: longCursor,
        limit: 10,
        filters: {},
    }, db);

    assert.strictEqual(longCursorResult.statusCode, 400, 'Long cursor should be rejected');
    console.log(`    Long cursor (10000 chars): Rejected with status 400`);

    console.log('  ✅ Long cursors rejected\n');

    // ========================================================================
    // Edge Case 8: SQL injection attempt
    // ========================================================================
    console.log('  Edge Case 8: SQL injection attempt');

    const sqlInjectionResult = await topupTransactionDal({
        method: 'get paginate',
        cursor: null,
        limit: 10,
        filters: { description: "'; DROP TABLE users; --" },
    }, db);

    // Should not crash, Prisma parameterizes queries
    assert.strictEqual(sqlInjectionResult.statusCode, 200, 'SQL injection should be safe');
    console.log(`    SQL injection attempt: Handled safely (parameterized)`);

    console.log('  ✅ Attack vectors protected\n');

    // ========================================================================
    // Edge Case 9: Cursor with special characters
    // ========================================================================
    console.log('  Edge Case 9: Cursor with special characters');

    const specialCursors = [
        '{"id":123}', // Valid JSON but missing required fields
        'null',
        'undefined',
        '[]',
        '{"id":"not-a-number"}',
    ];

    for (const cursor of specialCursors) {
        const result = await topupTransactionDal({
            method: 'get paginate',
            cursor: Buffer.from(cursor).toString('base64'),
            limit: 10,
            filters: {},
        }, db);
        assert.strictEqual(result.statusCode, 400, `Cursor "${cursor}" should be rejected`);
    }
    console.log(`    ${specialCursors.length} special cursors: All rejected`);

    console.log('  ✅ Special character cursors handled\n');

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('  ==========================================');
    console.log('  EDGE CASE SUMMARY');
    console.log('  ==========================================');
    console.log('  ✓ Boundary values: Handled (0, negative, large)');
    console.log('  ✓ Malformed data: Sanitized');
    console.log('  ✓ Missing params: Defaulted');
    console.log('  ✓ Null values: Sanitized');
    console.log('  ✓ Concurrent access: Thread-safe');
    console.log('  ✓ Invalid methods: Rejected');
    console.log('  ✓ Long cursors: Rejected');
    console.log('  ✓ SQL injection: Protected');
    console.log('  ✓ Special cursors: Handled');

    console.log('\n  ✅ PASSED: All edge cases handled robustly\n');
}

testProductionEdgeCases().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
