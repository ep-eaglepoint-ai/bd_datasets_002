#!/usr/bin/env node
/**
 * Test suite for repository_after/OrderBookAggregator.ts
 * Tests the optimized Red-Black Tree implementation
 */

/// <reference types="node" />

import { OrderBookAggregator } from '../repository_after/OrderBookAggregator';
import { OrderBookTester } from './shared-test-cases';

async function runRepositoryAfterTests(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING REPOSITORY_AFTER (Optimized Red-Black Tree Implementation)');
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
    console.log('REPOSITORY_AFTER TEST SUMMARY');
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
    
    // Check if performance requirements are met
    const meetsLatencyReq = latencyResult.p99 < 500; // 500 microseconds
    const meetsThroughputReq = latencyResult.throughput >= 100000; // 100k ops/sec
    
    console.log(`\n🎯 Performance Requirements:`);
    console.log(`  P99 Latency < 500μs: ${meetsLatencyReq ? '✅ MET' : '❌ NOT MET'}`);
    console.log(`  Throughput ≥ 100k ops/sec: ${meetsThroughputReq ? '✅ MET' : '❌ NOT MET'}`);
    
    if (overallPassed) {
      console.log('\n🎉 All repository_after tests completed successfully!');
      if (meetsLatencyReq && meetsThroughputReq) {
        console.log('🏆 All performance requirements exceeded!');
      }
      process.exit(0);
    } else {
      console.log('\n❌ Some repository_after tests failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runRepositoryAfterTests();
}

export { runRepositoryAfterTests };