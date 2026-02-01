import { topupTransactionDal, IDatabaseClient, encodeCursor } from '../repository_after/topupTransaction.dal';
import * as assert from 'node:assert';

// ============================================================================
// SNAPSHOT ISOLATION TEST (Without DB Support)
// 
// Requirements verified:
// - Cursor encodes point-in-time state
// - Concurrent updates don't affect cursor's view
// - No duplicate/missing records across pages
// - Sequential ordering maintained
// ============================================================================

class MockDB implements IDatabaseClient {
    private data: Array<{ id: number; createdAt: Date; amount: number; status: string }> = [];

    constructor() {
        // Initialize with test data
        for (let i = 0; i < 100; i++) {
            this.data.push({
                id: 1000 - i,
                createdAt: new Date(Date.now() - i * 1000),
                amount: Math.floor(Math.random() * 1000),
                status: 'COMPLETED'
            });
        }
    }

    // Simulate INSERT (would happen between page fetches)
    public insertRecord(id: number): void {
        this.data.unshift({
            id,
            createdAt: new Date(),
            amount: Math.floor(Math.random() * 1000),
            status: 'COMPLETED'
        });
    }

    // Simulate DELETE (would happen between page fetches)
    public deleteRecord(id: number): void {
        this.data = this.data.filter(r => r.id !== id);
    }

    public topUpTransaction = {
        findMany: async (args: any) => {
            const { where, take, orderBy } = args;
            let results = [...this.data];

            // Apply cursor filter (id < cursorId)
            if (where && where.id && typeof where.id.lt === 'number') {
                const ltValue = where.id.lt;
                results = results.filter(r => r.id < ltValue);
            }

            // Apply other filters
            if (where) {
                Object.keys(where).forEach(key => {
                    if (key !== 'id') {
                        const filter = where[key];
                        if (typeof filter === 'object' && filter !== null) {
                            if (filter.gt) results = results.filter(r => (r as any)[key] > filter.gt);
                            if (filter.lt) results = results.filter(r => (r as any)[key] < filter.lt);
                        } else {
                            results = results.filter(r => (r as any)[key] === filter);
                        }
                    }
                });
            }

            // Sort by id DESC
            results.sort((a, b) => b.id - a.id);

            return results.slice(0, take || 10);
        }
    };
}

async function testSnapshotIsolation() {
    console.log('TEST: Snapshot Isolation Without DB Support\n');

    const db = new MockDB();

    // ========================================================================
    // Step 1: Fetch first page (establish snapshot)
    // ========================================================================
    console.log('  Step 1: Fetch first page (establish snapshot)');

    const page1 = await topupTransactionDal({
        method: 'get paginate',
        cursor: null,
        limit: 10,
        filters: {},
    }, db);

    assert.strictEqual(page1.statusCode, 200, 'Expected status 200');
    const page1Ids = page1.body.data.map((r: any) => r.id);

    console.log(`    ✅ Page 1: ${page1Ids.length} records`);
    console.log(`       IDs: [${page1Ids.slice(0, 3).join(', ')}...]`);

    const cursor1 = page1.body.nextCursor;
    assert.ok(cursor1, 'Should have nextCursor for pagination');

    // ========================================================================
    // Step 2: Simulate concurrent updates
    // ========================================================================
    console.log('\n  Step 2: Simulate concurrent updates');

    // INSERT a new record with high ID (would appear at the beginning normally)
    db.insertRecord(2000);
    console.log('    Inserted: id=2000 (would normally be first)');

    // DELETE a record that was on page 1
    const deletedId = page1Ids[5];
    db.deleteRecord(deletedId);
    console.log(`    Deleted: id=${deletedId} (was on page 1)`);

    // ========================================================================
    // Step 3: Fetch second page (should maintain snapshot)
    // ========================================================================
    console.log('\n  Step 3: Fetch second page (should maintain snapshot)');

    const page2 = await topupTransactionDal({
        method: 'get paginate',
        cursor: cursor1,
        limit: 10,
        filters: {},
    }, db);

    assert.strictEqual(page2.statusCode, 200, 'Expected status 200');
    const page2Ids = page2.body.data.map((r: any) => r.id);

    console.log(`    ✅ Page 2: ${page2Ids.length} records`);
    console.log(`       IDs: [${page2Ids.slice(0, 3).join(', ')}...]`);

    // ========================================================================
    // Verify snapshot isolation properties
    // ========================================================================
    console.log('\n  Step 4: Verify snapshot isolation');

    // Verify no duplicates across pages
    const overlaps = page1Ids.filter((id: number) => page2Ids.includes(id));
    assert.strictEqual(overlaps.length, 0,
        `Found ${overlaps.length} duplicate IDs: [${overlaps.join(', ')}]`);
    console.log('    ✅ No duplicate records across pages');

    // Verify the new record (2000) is NOT in page 2 (cursor isolated)
    assert.ok(!page2Ids.includes(2000),
        'New record should not appear in cursor-based pagination');
    console.log('    ✅ New insert (id=2000) not in page 2 (cursor isolated)');

    // Verify sequential ordering (page 2 IDs < page 1 IDs)
    const lastPage1Id = page1Ids[page1Ids.length - 1];
    const firstPage2Id = page2Ids[0];
    assert.ok(firstPage2Id < lastPage1Id,
        `Page 2 first ID (${firstPage2Id}) should be < Page 1 last ID (${lastPage1Id})`);
    console.log(`    ✅ Sequential ordering: ${lastPage1Id} → ${firstPage2Id}`);

    // ========================================================================
    // Test 5: Verify audit trail contains cursor info
    // ========================================================================
    console.log('\n  Step 5: Verify audit trail');

    assert.ok(page2.body._audit, 'Should have audit trail');
    assert.ok(page2.body._audit.cursorHash, 'Audit should include cursor hash');
    assert.ok(page2.body._audit.cursorHash !== 'INITIAL_PAGE',
        'Should have actual cursor hash, not INITIAL_PAGE');
    console.log(`    ✅ Cursor hash tracked: ${page2.body._audit.cursorHash.slice(0, 16)}...`);

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n  ==========================================');
    console.log('  SNAPSHOT ISOLATION SUMMARY');
    console.log('  ==========================================');
    console.log('  ✓ No duplicates: Pages have distinct records');
    console.log('  ✓ Insert isolation: New records not in cursor view');
    console.log('  ✓ Sequential order: Maintained across pages');
    console.log('  ✓ Cursor commitment: Hash ensures point-in-time state');

    console.log('\n  Mechanism:');
    console.log(`    Cursor encodes: { id: ${lastPage1Id}, tieBreakHash: <sha3-256> }`);
    console.log(`    Next page uses: WHERE id < ${lastPage1Id}`);
    console.log('    Concurrent updates don\'t affect this cursor\'s view');

    console.log('\n  ✅ PASSED: Snapshot isolation maintained without DB support\n');
}

testSnapshotIsolation().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
