
import { topupTransactionDal as dalBefore } from '../repository_before/topupTransaction.dal';
import { topupTransactionDal as dalAfter } from '../repository_after/topupTransaction.dal';

// Helper to normalize response for comparison
// repository_before returns { body: { data, totalDocs, page, limit } }
// repository_after returns { body: { data, nextCursor, ... } }
// We only compare 'data' and 'statusCode'.
function normalize(response: any) {
    return {
        statusCode: response.statusCode,
        data: response.body.data.map((item: any) => ({
            id: item.id,
            amount: item.amount,
            status: item.status,
            userId: item.userId,
            // Normalize dates to ISO string for comparison
            createdAt: new Date(item.createdAt).toISOString(),
            updatedAt: new Date(item.updatedAt).toISOString()
        }))
    };
}

async function testConsistency() {
    console.log('🧪 TEST: Repository Consistency (Before vs After)\n');

    // Warmup
    await dalBefore({ method: 'get paginate', page: 1, limit: 1, filters: {} });
    await dalAfter({ method: 'get paginate', cursor: null, limit: 1, filters: {} });

    // Test 1: First Page Data Parity
    console.log('  Test 1: First Page Data Parity (Limit 50)');
    const resBefore1 = await dalBefore({
        method: 'get paginate',
        page: 1,
        limit: 50,
        filters: {}
    });

    const resAfter1 = await dalAfter({
        method: 'get paginate',
        cursor: null,
        limit: 50,
        filters: {}
    });

    if (JSON.stringify(normalize(resBefore1)) !== JSON.stringify(normalize(resAfter1))) {
        console.error('  ❌ FAILED: Data mismatch on first page');
        console.log('Before length:', resBefore1.body.data.length);
        console.log('After length:', resAfter1.body.data.length);
        console.log('Sample Before:', resBefore1.body.data[0]);
        console.log('Sample After:', resAfter1.body.data[0]);
        process.exit(1);
    }
    console.log('  ✅ PASSED: Identical data returned');

    // Test 2: Filtering Consistency
    console.log('\n  Test 2: Filtering Consistency (id > 500)');
    // Note: We pick a filter likely to return results
    const filter = { id: { gt: 500 } };

    // repository_before uses page: 1
    const resBefore2 = await dalBefore({
        method: 'get paginate',
        page: 1,
        limit: 20,
        filters: filter
    });

    // repository_after uses cursor: null
    const resAfter2 = await dalAfter({
        method: 'get paginate',
        cursor: null,
        limit: 20,
        filters: filter
    });

    if (JSON.stringify(normalize(resBefore2)) !== JSON.stringify(normalize(resAfter2))) {
        console.error('  ❌ FAILED: Data mismatch with filter');
        process.exit(1);
    }
    console.log('  ✅ PASSED: Identical filtered data returned');

    // Test 3: Empty Result Consistency
    console.log('\n  Test 3: Empty Result Consistency (Impossible Filter)');
    const impossibleFilter = { id: -999999 };

    const resBefore3 = await dalBefore({
        method: 'get paginate',
        page: 1,
        limit: 20,
        filters: impossibleFilter
    });

    const resAfter3 = await dalAfter({
        method: 'get paginate',
        cursor: null,
        limit: 20,
        filters: impossibleFilter
    });

    if (resBefore3.body.data.length !== 0 || resAfter3.body.data.length !== 0) {
        console.error('  ❌ FAILED: Expected empty results');
        process.exit(1);
    }

    // Compare empty states
    if (JSON.stringify(normalize(resBefore3)) !== JSON.stringify(normalize(resAfter3))) {
        console.error('  ❌ FAILED: Empty state mismatch');
        process.exit(1);
    }
    console.log('  ✅ PASSED: Both return empty consistent responses');

    console.log('\n  ✅ ALL CONSISTENCY TESTS PASSED');
}

testConsistency().catch(err => {
    console.error(err);
    process.exit(1);
});
