#!/usr/bin/env node
/**
 * Test suite for repository_before/OrderBookAggregator.ts
 * Tests the original array-based implementation
 */

/// <reference types="node" />

import { OrderBookAggregator } from '../repository_before/OrderBookAggregator';
import { OrderBookTester } from './shared-test-cases';

async function runRepositoryBeforeTests(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING REPOSITORY_BEFORE (Original Array-based Implementation)');
  console.log('='.repeat(60));
  
  const tester = new OrderBookTester();
  
  try {
    // Run functional tests first
    const functionalPassed = tester.runFunctionalTests(OrderBookAggregator);
    
    if (!functionalPassed) {
      console.log('\n❌ Functional tests failed. Stopping execution.');
      process.exit(1);
    }
    
    // Run performance benchmarks
    const results = await tester.runBenchmarkSuite(OrderBookAggregator);
    tester.printResults();
    
    // Run high-frequency latency test
    const latencyResult = await tester.runLatencyTest(OrderBookAggregator);
    
    console.log('\n' + '='.repeat(60));
    console.log('REPOSITORY_BEFORE TEST SUMMARY');
    console.log('='.repeat(60));
    
    const allBenchmarksPassed = results.every(r => r.passed);
    const overallPassed = functionalPassed && allBenchmarksPassed && latencyResult.passed;
    
    console.log(`\n📊 Test Results:`);
    console.log(`  Functional Tests: ${functionalPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Performance Benchmarks: ${allBenchmarksPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Latency Requirements: ${latencyResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Overall: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    console.log(`\n📈 Performance Summary:`);
    console.log(`  Average Throughput: ${Math.floor(results.reduce((sum, r) => sum + r.throughput, 0) / results.length).toLocaleString()} ops/sec`);
    console.log(`  P99 Latency: ${latencyResult.p99.toFixed(2)}μs`);
    console.log(`  Max Throughput: ${Math.floor(latencyResult.throughput).toLocaleString()} ops/sec`);
    
    if (overallPassed) {
      console.log('\n🎉 All repository_before tests completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Some repository_before tests failed!');
      // repository_before is expected to fail performance tests - this demonstrates the need for optimization
      console.log('ℹ️  Performance failures in repository_before are expected and demonstrate the optimization need.');
      process.exit(0); // Don't fail the build - this is expected behavior
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runRepositoryBeforeTests();
}

export { runRepositoryBeforeTests };