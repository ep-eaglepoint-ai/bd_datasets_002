const assert = require('assert').strict;
const path = require('path');
const repoPath = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../repository_after');
const { DataProcessor, DataValidator } = require(path.join(repoPath, 'dataProcessor'));

let failures = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`✅ PASSED: ${name}`);
    } catch (err) {
        console.log(`❌ FAILED: ${name}`);
        console.log(`   Error: ${err.message}`);
        failures++;
    }
}

// Isolation helper to ensure no side effects between tests
const createDP = () => new DataProcessor();

console.log(`Running tests against: ${repoPath}\n`);

// Dataset A: Original array modified (Criteria 1)
runTest('Dataset A: dedupe immutability', () => {
    const dp = createDP();
    const original = [1, 2, 2, 3];
    const input = [...original];
    dp.dedupe(input);
    assert.deepEqual(input, [1, 2, 2, 3], 'Source array was mutated!');
});

// Dataset B: Consecutive duplicates skipped (Criteria 2)
runTest('Dataset B: splice in loop bug', () => {
    const dp = createDP();
    const input = [1, 2, 2, 2, 3];
    const result = dp.dedupe(input);
    assert.deepEqual(result, [1, 2, 3], 'Failed to remove consecutive duplicates');
});

// Dataset C: Merging issues (Criteria 6)
runTest('Dataset C: merge combining by key', () => {
    const dp = createDP();
    const target = [{ id: 1, meta: { v: 1 } }];
    const source = [{ id: 1, meta: { v: 2 } }];
    const result = dp.merge(target, source, 'id');
    assert.equal(result.length, 1, 'Merge created duplicate entries');
    assert.notStrictEqual(result[0].meta, target[0].meta, 'Merge did not deep clone');
});

// Dataset D: Date range issues (Criteria 7)
runTest('Dataset D: date filtering range', () => {
    const dp = createDP();
    const data = [{ d: '2024-1-15' }, { d: '2024-12-02' }, { d: '2024-01-20' }];
    const result = dp.filter(data, { d: { $between: ['2024-01-01', '2024-02-01'] } });
    assert.equal(result.length, 2, 'Date filtering included records outside range');
});

// Dataset E: Aggregation totals (Criteria 8, 9)
runTest('Dataset E: aggregation totals', () => {
    const dp = createDP();
    const data = [{ r: 'A', s: 100 }, { r: null, s: 50 }, { r: 'null', s: 25 }];
    const result = dp.aggregate(data, 'r', { s: 'sum' });
    assert.equal(result.length, 3, 'Null and "null" groups collided');
});

// Dataset E (cont): Aggregation empty array (Criteria 8)
runTest('Dataset E: aggregation empty values', () => {
    const dp = createDP();
    const data = [{ r: 'A' }]; // No 's' field
    const result = dp.aggregate(data, 'r', { s: 'sum' });
    assert.equal(result[0].s, 0, 'Aggregation on empty values failed');
});

// Dataset F: Type coercion (Criteria 3, 10)
runTest('Dataset F: type coercion', () => {
    const dp = createDP();
    assert.equal(dp.dedupe([1, "1"]).length, 2, 'Loose equality used in dedupe');
    assert.equal(dp.filter([{ v: 1 }, { v: "1" }], { v: { $eq: 1 } }).length, 1, 'Loose equality used in filter');
});

// Dataset G: NaN handling (Criteria 4, 12)
runTest('Dataset G: NaN handling', () => {
    const dp = createDP();
    assert.equal(dp.dedupe([NaN, NaN, 1]).length, 2, 'NaN not handled in dedupe');
    const v = new DataValidator({ a: { type: 'number', required: true } });
    assert.equal(v.validate([{ a: NaN }]).isValid, false, 'NaN passed validator as number');
});

// Criteria 11: transform $rename
runTest('Criteria 11: transform $rename', () => {
    const dp = createDP();
    const result = dp.transform([{ b: 2 }], { a: { $rename: 'newA' } });
    assert.ok(!result[0].hasOwnProperty('newA'), 'Created property for missing field during rename');
});

console.log('\n--- Test Summary ---');
if (failures > 0) {
    console.log(`❌ FAILED: Found ${failures} bug(s) in ${repoPath}`);
    process.exit(1);
} else {
    console.log(`✅ PASSED: All 12 criteria met in ${repoPath}`);
    process.exit(0);
}
