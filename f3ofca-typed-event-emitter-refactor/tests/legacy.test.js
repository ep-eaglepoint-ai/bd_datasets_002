// filename: legacy.test.js

const assert = require('assert');

/**
 * Test Suite checking for required features
 * These tests should FAIL on repository_before (lacks features) and PASS on repository_after (has features)
 */

async function testLegacySchemaEnforcement() {
    const impl = require('../repository_before/LegacyBusManager');
    
    // Test that schema enforcement exists
    try {
        await impl.emit('UNREGISTERED_EVENT', {});
        throw new Error('Schema enforcement not working - unregistered event should throw');
    } catch (error) {
        if (error.name !== 'SchemaViolationError') {
            throw new Error('Legacy implementation does not enforce schemas');
        }
    }
}

async function testLegacyAsyncDispatch() {
    const impl = require('../repository_before/LegacyBusManager');
    
    // Test that async dispatch exists
    const startTime = Date.now();
    await impl.emit('ORDER_CREATED', { id: '123', total: 100, items: [] });
    const duration = Date.now() - startTime;
    
    if (duration >= 10) {
        throw new Error('Legacy implementation is synchronous and blocking');
    }
}

async function testLegacyMiddleware() {
    const impl = require('../repository_before/LegacyBusManager');
    
    // Test that middleware support exists
    if (!impl.kernel || typeof impl.kernel.use !== 'function') {
        throw new Error('Legacy implementation does not support middleware');
    }
}

async function testLegacyDLQ() {
    const impl = require('../repository_before/LegacyBusManager');
    
    // Test that DLQ exists
    if (!impl.kernel || typeof impl.kernel.getDLQ !== 'function') {
        throw new Error('Legacy implementation does not have Dead Letter Queue');
    }
}

async function testLegacyCircuitBreaker() {
    const impl = require('../repository_before/LegacyBusManager');
    
    // Test that circuit breaker tracking exists
    if (!impl.kernel || !impl.kernel.circuitBreakers) {
        throw new Error('Legacy implementation does not have Circuit Breaker');
    }
}

async function testLegacyObservability() {
    const impl = require('../repository_before/LegacyBusManager');
    
    // Test that getStats method exists
    if (!impl.kernel || typeof impl.kernel.getStats !== 'function') {
        throw new Error('Legacy implementation does not have getStats method');
    }
}

async function runAllLegacyTests() {
    const tests = [
        { name: 'Legacy Schema Enforcement', fn: testLegacySchemaEnforcement },
        { name: 'Legacy Async Dispatch', fn: testLegacyAsyncDispatch },
        { name: 'Legacy Middleware', fn: testLegacyMiddleware },
        { name: 'Legacy DLQ', fn: testLegacyDLQ },
        { name: 'Legacy Circuit Breaker', fn: testLegacyCircuitBreaker },
        { name: 'Legacy Observability', fn: testLegacyObservability }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            await test.fn();
            console.log(`  [✓ PASS] ${test.name}`);
            passed++;
        } catch (error) {
            console.log(`  [✗ FAIL] ${test.name}`);
            console.log(`    Error: ${error.message}`);
            failed++;
        }
    }

    return { passed, failed, total: tests.length };
}

module.exports = { runAllLegacyTests };

if (require.main === module) {
    runAllLegacyTests().then(results => {
        console.log(`\nResults: ${results.passed} passed, ${results.failed} failed (total: ${results.total})`);
        process.exit(results.failed > 0 ? 1 : 0);
    });
}
