/// <reference types="node" />

/**
 * Shared test cases and utilities for testing OrderBookAggregator implementations
 * This file contains the common test scenarios used by both repository_before and repository_after tests
 */

export interface TestResult {
  name: string;
  executionTime: number;
  throughput: number;
  passed: boolean;
  details?: string;
}

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export class OrderBookTester {
  private results: TestResult[] = [];

  /**
   * Generate test updates for performance testing
   */
  generateUpdates(count: number): Array<{side: string, price: number, quantity: number}> {
    const updates = [];
    for (let i = 0; i < count; i++) {
      updates.push({
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        price: Math.round((100 + Math.random() * 50) * 10000) / 10000, // 4 decimal precision
        quantity: Math.round(Math.random() * 1000 * 100) / 100
      });
    }
    return updates;
  }

  generateMixedOperations(count: number): Array<{side: string, price: number, quantity: number}> {
    const updates: Array<{side: string, price: number, quantity: number}> = [];
    const prices = new Set<number>();
    
    for (let i = 0; i < count; i++) {
      const price = Math.round((100 + Math.random() * 50) * 10000) / 10000;
      const isDelete = prices.has(price) && Math.random() > 0.7;
      
      updates.push({
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        price: price,
        quantity: isDelete ? 0 : Math.round(Math.random() * 1000 * 100) / 100
      });
      
      if (!isDelete) prices.add(price);
      else prices.delete(price);
    }
    return updates;
  }

  generateHighFrequencyUpdates(count: number): Array<{side: string, price: number, quantity: number}> {
    const updates: Array<{side: string, price: number, quantity: number}> = [];
    const hotPrices = [100.1234, 100.2345, 100.3456]; // Frequently updated prices
    
    for (let i = 0; i < count; i++) {
      const useHotPrice = Math.random() > 0.3;
      const price = useHotPrice ? 
        hotPrices[Math.floor(Math.random() * hotPrices.length)] :
        Math.round((100 + Math.random() * 50) * 10000) / 10000;
      
      updates.push({
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        price: price,
        quantity: Math.round(Math.random() * 1000 * 100) / 100
      });
    }
    return updates;
  }

  generateLargeOrderBookUpdates(count: number): Array<{side: string, price: number, quantity: number}> {
    const updates: Array<{side: string, price: number, quantity: number}> = [];
    
    // First, create a large order book
    for (let i = 0; i < count * 0.8; i++) {
      updates.push({
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        price: Math.round((50 + Math.random() * 200) * 10000) / 10000, // Wider price range
        quantity: Math.round(Math.random() * 1000 * 100) / 100
      });
    }
    
    // Then add updates to existing levels
    for (let i = 0; i < count * 0.2; i++) {
      const existingUpdate: {side: string, price: number, quantity: number} = updates[Math.floor(Math.random() * updates.length)];
      updates.push({
        side: existingUpdate.side,
        price: existingUpdate.price,
        quantity: Math.round(Math.random() * 1000 * 100) / 100
      });
    }
    
    return updates;
  }

  /**
   * Run performance benchmark on a given aggregator implementation
   */
  async runBenchmark(
    aggregatorClass: any, 
    testName: string, 
    updates: Array<{side: string, price: number, quantity: number}>
  ): Promise<TestResult> {
    console.log(`🚀 Running ${testName}...`);
    
    const aggregator = new aggregatorClass();
    
    const startTime = process.hrtime.bigint();
    
    // Execute all updates
    updates.forEach(update => aggregator.handleUpdate(update));
    
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const throughput = updates.length / (executionTime / 1000); // Operations per second
    
    // Verify the aggregator works correctly
    const result = aggregator.getTopLevels(5);
    const passed = result && result.bids && result.asks && 
                   Array.isArray(result.bids) && Array.isArray(result.asks);
    
    const testResult: TestResult = {
      name: testName,
      executionTime,
      throughput,
      passed,
      details: passed ? undefined : 'Failed to get valid top levels'
    };
    
    this.results.push(testResult);
    
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${executionTime.toFixed(2)}ms (${Math.floor(throughput).toLocaleString()} ops/sec)`);
    
    return testResult;
  }

  /**
   * Run functional correctness tests
   */
  runFunctionalTests(aggregatorClass: any): boolean {
    console.log('🔍 Running Functional Correctness Tests...\n');
    
    let allPassed = true;

    // Test 1: Basic functionality
    try {
      const aggregator = new aggregatorClass();
      
      const testUpdates = [
        { side: 'buy', price: 100.1234, quantity: 50 },
        { side: 'sell', price: 100.5678, quantity: 30 },
        { side: 'buy', price: 100.0000, quantity: 100 },
        { side: 'sell', price: 100.9999, quantity: 25 }
      ];
      
      testUpdates.forEach(update => aggregator.handleUpdate(update));
      const result = aggregator.getTopLevels(5);
      
      const passed = result && result.bids && result.asks && 
                     result.bids.length === 2 && result.asks.length === 2;
      
      console.log(`✅ Basic Functionality: ${passed ? 'PASSED' : 'FAILED'}`);
      if (!passed) allPassed = false;
    } catch (error) {
      console.log(`❌ Basic Functionality: FAILED - ${error}`);
      allPassed = false;
    }

    // Test 2: Precision handling
    try {
      const aggregator = new aggregatorClass();
      
      const precisionUpdates = [
        { side: 'buy', price: 100.1234, quantity: 50 },
        { side: 'buy', price: 100.1235, quantity: 30 }, // Very close price
        { side: 'sell', price: 100.9999, quantity: 25 },
        { side: 'sell', price: 100.9998, quantity: 40 }
      ];
      
      precisionUpdates.forEach(update => aggregator.handleUpdate(update));
      const result = aggregator.getTopLevels(5);
      
      const passed = result && result.bids && result.asks && 
                     result.bids.length === 2 && result.asks.length === 2;
      
      console.log(`✅ Precision Handling: ${passed ? 'PASSED' : 'FAILED'}`);
      if (!passed) allPassed = false;
    } catch (error) {
      console.log(`❌ Precision Handling: FAILED - ${error}`);
      allPassed = false;
    }

    // Test 3: Edge cases
    try {
      const aggregator = new aggregatorClass();
      
      const edgeCaseUpdates = [
        { side: 'buy', price: 100.0000, quantity: 50 },
        { side: 'buy', price: 100.0000, quantity: 75 }, // Update existing
        { side: 'buy', price: 100.0000, quantity: 0 },  // Delete
        { side: 'sell', price: 101.0000, quantity: 0 }, // Delete non-existent
      ];
      
      edgeCaseUpdates.forEach(update => aggregator.handleUpdate(update));
      const result = aggregator.getTopLevels(5);
      
      const passed = result && result.bids && result.asks && 
                     result.bids.length === 0; // Should be empty after deletion
      
      console.log(`✅ Edge Cases: ${passed ? 'PASSED' : 'FAILED'}`);
      if (!passed) allPassed = false;
    } catch (error) {
      console.log(`❌ Edge Cases: FAILED - ${error}`);
      allPassed = false;
    }

    // Test 4: Sorting order
    try {
      const aggregator = new aggregatorClass();
      
      const sortingUpdates = [
        { side: 'buy', price: 100.0000, quantity: 50 },
        { side: 'buy', price: 101.0000, quantity: 30 },
        { side: 'buy', price: 99.0000, quantity: 40 },
        { side: 'sell', price: 102.0000, quantity: 25 },
        { side: 'sell', price: 103.0000, quantity: 35 },
        { side: 'sell', price: 101.5000, quantity: 45 }
      ];
      
      sortingUpdates.forEach(update => aggregator.handleUpdate(update));
      const result = aggregator.getTopLevels(10);
      
      // Check bid ordering (descending)
      let bidsCorrect = true;
      for (let i = 1; i < result.bids.length; i++) {
        if (result.bids[i].price > result.bids[i-1].price) {
          bidsCorrect = false;
          break;
        }
      }
      
      // Check ask ordering (ascending)
      let asksCorrect = true;
      for (let i = 1; i < result.asks.length; i++) {
        if (result.asks[i].price < result.asks[i-1].price) {
          asksCorrect = false;
          break;
        }
      }
      
      const passed = bidsCorrect && asksCorrect;
      console.log(`✅ Sorting Order: ${passed ? 'PASSED' : 'FAILED'}`);
      if (!passed) allPassed = false;
    } catch (error) {
      console.log(`❌ Sorting Order: FAILED - ${error}`);
      allPassed = false;
    }

    return allPassed;
  }

  /**
   * Run high-frequency latency test
   */
  async runLatencyTest(aggregatorClass: any): Promise<{throughput: number, p99: number, passed: boolean}> {
    console.log('\n⚡ Running High-Frequency Latency Test...\n');
    
    const aggregator = new aggregatorClass();
    const targetUpdatesPerSecond = 100000;
    const testDurationSeconds = 0.1; // Reduced to 0.1 seconds for faster testing
    const totalUpdates = Math.floor(targetUpdatesPerSecond * testDurationSeconds);
    
    const latencies: number[] = [];
    
    console.log(`Generating ${totalUpdates} updates...`);
    
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < totalUpdates; i++) {
      const update = {
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        price: Math.round((100 + Math.random() * 50) * 10000) / 10000,
        quantity: Math.round(Math.random() * 1000 * 100) / 100
      };
      
      const updateStart = process.hrtime.bigint();
      aggregator.handleUpdate(update);
      const updateEnd = process.hrtime.bigint();
      
      const latencyNs = Number(updateEnd - updateStart);
      const latencyMicros = latencyNs / 1000;
      latencies.push(latencyMicros);
    }
    
    const totalTime = process.hrtime.bigint() - startTime;
    const totalTimeMs = Number(totalTime) / 1000000;
    
    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const max = latencies[latencies.length - 1];
    
    const actualThroughput = totalUpdates / (totalTimeMs / 1000);
    
    console.log(`📊 Latency Test Results:`);
    console.log(`   Total Updates: ${totalUpdates.toLocaleString()}`);
    console.log(`   Total Time: ${totalTimeMs.toFixed(2)}ms`);
    console.log(`   Throughput: ${Math.floor(actualThroughput).toLocaleString()} updates/sec`);
    console.log(`   P50 Latency: ${p50.toFixed(2)}μs`);
    console.log(`   P95 Latency: ${p95.toFixed(2)}μs`);
    console.log(`   P99 Latency: ${p99.toFixed(2)}μs`);
    console.log(`   Max Latency: ${max.toFixed(2)}μs`);
    
    const p99Passed = p99 < 500;
    const throughputPassed = actualThroughput >= targetUpdatesPerSecond * 0.95; // Allow 5% tolerance
    const passed = p99Passed && throughputPassed;
    
    console.log(`\n✅ P99 Latency < 500μs: ${p99Passed ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Throughput ≥ 100k/sec: ${throughputPassed ? 'PASSED' : 'FAILED'}\n`);
    
    return { throughput: actualThroughput, p99, passed };
  }

  /**
   * Run complete benchmark suite
   */
  async runBenchmarkSuite(aggregatorClass: any): Promise<TestResult[]> {
    console.log('🚀 Starting OrderBookAggregator Performance Benchmark Suite\n');

    // Test 1: Basic update performance
    await this.runBenchmark(aggregatorClass, 'Basic Updates (10k)', this.generateUpdates(10000));
    
    // Test 2: Mixed operations (inserts, updates, deletes)
    await this.runBenchmark(aggregatorClass, 'Mixed Operations (10k)', this.generateMixedOperations(10000));
    
    // Test 3: High-frequency updates on same price levels
    await this.runBenchmark(aggregatorClass, 'High Frequency Same Price (10k)', this.generateHighFrequencyUpdates(10000));
    
    // Test 4: Large order book depth
    await this.runBenchmark(aggregatorClass, 'Large Order Book (10k)', this.generateLargeOrderBookUpdates(10000));

    return this.results;
  }

  /**
   * Print benchmark results summary
   */
  printResults(): void {
    console.log('\n📊 Performance Benchmark Results:\n');
    console.log('Test Name'.padEnd(30) + 'Time (ms)'.padEnd(15) + 'Throughput'.padEnd(20) + 'Status');
    console.log('-'.repeat(75));
    
    let passedTests = 0;
    
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      const throughputStr = `${Math.floor(result.throughput).toLocaleString()} ops/sec`;
      console.log(
        result.name.padEnd(30) +
        result.executionTime.toFixed(2).padEnd(15) +
        throughputStr.padEnd(20) +
        status
      );
      
      if (result.passed) passedTests++;
    });
    
    console.log('-'.repeat(75));
    console.log(`\n📈 Summary:`);
    console.log(`   Tests Passed: ${passedTests}/${this.results.length}`);
  }

  /**
   * Clear results for new test run
   */
  clearResults(): void {
    this.results = [];
  }
}