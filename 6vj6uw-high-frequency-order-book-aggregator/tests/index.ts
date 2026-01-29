// Test suite for OrderBookAggregator optimization
// Validates performance improvements and functional correctness

/// <reference types="node" />

import { OrderBookAggregator as OriginalAggregator } from '../repository_before/OrderBookAggregator';
import { OrderBookAggregator as OptimizedAggregator } from '../repository_after/OrderBookAggregator';

interface TestResult {
  name: string;
  originalTime: number;
  optimizedTime: number;
  improvement: number;
  passed: boolean;
}

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

class PerformanceTester {
  private results: TestResult[] = [];

  /**
   * Requirement 7: Benchmark suite comparing execution time of 10,000 updates
   */
  async runBenchmarkSuite(): Promise<void> {
    console.log('🚀 Starting OrderBookAggregator Performance Benchmark Suite\n');

    // Test 1: Basic update performance
    await this.benchmarkBasicUpdates();
    
    // Test 2: Mixed operations (inserts, updates, deletes)
    await this.benchmarkMixedOperations();
    
    // Test 3: High-frequency updates on same price levels
    await this.benchmarkHighFrequencyUpdates();
    
    // Test 4: Large order book depth
    await this.benchmarkLargeOrderBook();

    this.printResults();
  }

  /**
   * Requirement 8: Memory leak test running for 5 minutes under load
   */
  async runMemoryLeakTest(): Promise<void> {
    console.log('🧪 Starting Memory Leak Test (5 minutes under load)\n');
    
    const aggregator = new OptimizedAggregator();
    const testDurationMs = 5 * 60 * 1000; // 5 minutes
    const updateInterval = 1; // 1ms between updates for high load
    const memoryCheckInterval = 10000; // Check memory every 10 seconds
    
    const startTime = Date.now();
    const memorySnapshots: MemoryStats[] = [];
    
    let updateCount = 0;
    
    // Start memory monitoring
    const memoryMonitor = setInterval(() => {
      const memStats = process.memoryUsage();
      memorySnapshots.push({
        heapUsed: memStats.heapUsed,
        heapTotal: memStats.heapTotal,
        external: memStats.external,
        rss: memStats.rss
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`Memory check at ${Math.floor(elapsed/1000)}s: RSS=${Math.floor(memStats.rss/1024/1024)}MB, Heap=${Math.floor(memStats.heapUsed/1024/1024)}MB, Updates=${updateCount}`);
    }, memoryCheckInterval);

    // Generate continuous load
    const loadGenerator = setInterval(() => {
      const update = this.generateRandomUpdate();
      aggregator.handleUpdate(update);
      updateCount++;
      
      if (Date.now() - startTime >= testDurationMs) {
        clearInterval(loadGenerator);
        clearInterval(memoryMonitor);
        this.analyzeMemoryStability(memorySnapshots);
      }
    }, updateInterval);

    // Wait for test completion
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, testDurationMs + 1000);
    });
  }

  /**
   * Requirement 1: Test 100k updates/sec with p99 latency under 500 microseconds
   */
  async runLatencyTest(): Promise<void> {
    console.log('⚡ Starting High-Frequency Latency Test (100k updates/sec)\n');
    
    const aggregator = new OptimizedAggregator();
    const targetUpdatesPerSecond = 100000;
    const testDurationSeconds = 1;
    const totalUpdates = targetUpdatesPerSecond * testDurationSeconds;
    
    const latencies: number[] = [];
    
    console.log(`Generating ${totalUpdates} updates...`);
    
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < totalUpdates; i++) {
      const update = this.generateRandomUpdate();
      
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
    
    console.log(`\n✅ P99 Latency < 500μs: ${p99Passed ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Throughput ≥ 100k/sec: ${throughputPassed ? 'PASSED' : 'FAILED'}\n`);
  }

  /**
   * Functional correctness tests
   */
  runFunctionalTests(): void {
    console.log('🔍 Running Functional Correctness Tests\n');
    
    this.testBasicFunctionality();
    this.testPrecisionHandling();
    this.testEdgeCases();
    this.testSortingOrder();
  }

  private async benchmarkBasicUpdates(): Promise<void> {
    const updateCount = 10000;
    const updates = this.generateUpdates(updateCount);
    
    const result = await this.compareImplementations(
      'Basic Updates (10k)',
      updates,
      (agg, updates) => {
        updates.forEach(update => agg.handleUpdate(update));
      }
    );
    
    this.results.push(result);
  }

  private async benchmarkMixedOperations(): Promise<void> {
    const updates = this.generateMixedOperations(10000);
    
    const result = await this.compareImplementations(
      'Mixed Operations (10k)',
      updates,
      (agg, updates) => {
        updates.forEach(update => agg.handleUpdate(update));
      }
    );
    
    this.results.push(result);
  }

  private async benchmarkHighFrequencyUpdates(): Promise<void> {
    const updates = this.generateHighFrequencyUpdates(10000);
    
    const result = await this.compareImplementations(
      'High Frequency Same Price (10k)',
      updates,
      (agg, updates) => {
        updates.forEach(update => agg.handleUpdate(update));
      }
    );
    
    this.results.push(result);
  }

  private async benchmarkLargeOrderBook(): Promise<void> {
    const updates = this.generateLargeOrderBookUpdates(10000);
    
    const result = await this.compareImplementations(
      'Large Order Book (10k)',
      updates,
      (agg, updates) => {
        updates.forEach(update => agg.handleUpdate(update));
      }
    );
    
    this.results.push(result);
  }

  private async compareImplementations<T>(
    testName: string,
    testData: T,
    testFunction: (aggregator: any, data: T) => void
  ): Promise<TestResult> {
    // Test original implementation
    const originalAgg = new OriginalAggregator();
    const originalStart = process.hrtime.bigint();
    testFunction(originalAgg, testData);
    const originalEnd = process.hrtime.bigint();
    const originalTime = Number(originalEnd - originalStart) / 1000000; // Convert to ms

    // Test optimized implementation
    const optimizedAgg = new OptimizedAggregator();
    const optimizedStart = process.hrtime.bigint();
    testFunction(optimizedAgg, testData);
    const optimizedEnd = process.hrtime.bigint();
    const optimizedTime = Number(optimizedEnd - optimizedStart) / 1000000; // Convert to ms

    // Verify results are identical
    const originalResult = originalAgg.getTopLevels(10);
    const optimizedResult = optimizedAgg.getTopLevels(10);
    const passed = this.compareResults(originalResult, optimizedResult);

    const improvement = ((originalTime - optimizedTime) / originalTime) * 100;

    return {
      name: testName,
      originalTime,
      optimizedTime,
      improvement,
      passed
    };
  }

  private compareResults(original: any, optimized: any): boolean {
    // Deep comparison of results
    if (original.bids.length !== optimized.bids.length || 
        original.asks.length !== optimized.asks.length) {
      console.log(`Length mismatch - Original bids: ${original.bids.length}, Optimized bids: ${optimized.bids.length}`);
      console.log(`Length mismatch - Original asks: ${original.asks.length}, Optimized asks: ${optimized.asks.length}`);
      return false;
    }

    for (let i = 0; i < original.bids.length; i++) {
      if (Math.abs(original.bids[i].price - optimized.bids[i].price) > 0.0001 ||
          Math.abs(original.bids[i].quantity - optimized.bids[i].quantity) > 0.0001) {
        console.log(`Bid mismatch at index ${i}:`);
        console.log(`  Original: price=${original.bids[i].price}, quantity=${original.bids[i].quantity}`);
        console.log(`  Optimized: price=${optimized.bids[i].price}, quantity=${optimized.bids[i].quantity}`);
        return false;
      }
    }

    for (let i = 0; i < original.asks.length; i++) {
      if (Math.abs(original.asks[i].price - optimized.asks[i].price) > 0.0001 ||
          Math.abs(original.asks[i].quantity - optimized.asks[i].quantity) > 0.0001) {
        console.log(`Ask mismatch at index ${i}:`);
        console.log(`  Original: price=${original.asks[i].price}, quantity=${original.asks[i].quantity}`);
        console.log(`  Optimized: price=${optimized.asks[i].price}, quantity=${optimized.asks[i].quantity}`);
        return false;
      }
    }

    return true;
  }

  private generateUpdates(count: number): Array<{side: string, price: number, quantity: number}> {
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

  private generateMixedOperations(count: number): Array<{side: string, price: number, quantity: number}> {
    const updates = [];
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

  private generateHighFrequencyUpdates(count: number): Array<{side: string, price: number, quantity: number}> {
    const updates = [];
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

  private generateLargeOrderBookUpdates(count: number): Array<{side: string, price: number, quantity: number}> {
    const updates = [];
    
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

  private generateRandomUpdate(): {side: string, price: number, quantity: number} {
    return {
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      price: Math.round((100 + Math.random() * 50) * 10000) / 10000,
      quantity: Math.random() > 0.1 ? Math.round(Math.random() * 1000 * 100) / 100 : 0
    };
  }

  private analyzeMemoryStability(snapshots: MemoryStats[]): void {
    if (snapshots.length < 2) {
      console.log('❌ Insufficient memory snapshots for analysis');
      return;
    }

    const rssValues = snapshots.map(s => s.rss);
    const heapValues = snapshots.map(s => s.heapUsed);
    
    const rssGrowth = (rssValues[rssValues.length - 1] - rssValues[0]) / rssValues[0] * 100;
    const heapGrowth = (heapValues[heapValues.length - 1] - heapValues[0]) / heapValues[0] * 100;
    
    const rssStable = Math.abs(rssGrowth) < 20; // Allow 20% growth
    const heapStable = Math.abs(heapGrowth) < 50; // Allow 50% heap growth due to GC cycles
    
    console.log(`\n📊 Memory Stability Analysis:`);
    console.log(`   RSS Growth: ${rssGrowth.toFixed(2)}%`);
    console.log(`   Heap Growth: ${heapGrowth.toFixed(2)}%`);
    console.log(`   RSS Stable: ${rssStable ? 'PASSED' : 'FAILED'}`);
    console.log(`   Heap Stable: ${heapStable ? 'PASSED' : 'FAILED'}\n`);
  }

  private testBasicFunctionality(): void {
    const original = new OriginalAggregator();
    const optimized = new OptimizedAggregator();
    
    const testUpdates = [
      { side: 'buy', price: 100.1234, quantity: 50 },
      { side: 'sell', price: 100.5678, quantity: 30 },
      { side: 'buy', price: 100.0000, quantity: 100 },
      { side: 'sell', price: 100.9999, quantity: 25 }
    ];
    
    testUpdates.forEach(update => {
      original.handleUpdate(update);
      optimized.handleUpdate(update);
    });
    
    const originalResult = original.getTopLevels(5);
    const optimizedResult = optimized.getTopLevels(5);
    
    const passed = this.compareResults(originalResult, optimizedResult);
    console.log(`✅ Basic Functionality: ${passed ? 'PASSED' : 'FAILED'}`);
  }

  private testPrecisionHandling(): void {
    const original = new OriginalAggregator();
    const optimized = new OptimizedAggregator();
    
    // Test 4-decimal precision requirement
    const precisionUpdates = [
      { side: 'buy', price: 100.1234, quantity: 50 },
      { side: 'buy', price: 100.1235, quantity: 30 }, // Very close price
      { side: 'sell', price: 100.9999, quantity: 25 },
      { side: 'sell', price: 100.9998, quantity: 40 }
    ];
    
    precisionUpdates.forEach(update => {
      original.handleUpdate(update);
      optimized.handleUpdate(update);
    });
    
    const originalResult = original.getTopLevels(5);
    const optimizedResult = optimized.getTopLevels(5);
    
    const passed = this.compareResults(originalResult, optimizedResult);
    console.log(`✅ Precision Handling: ${passed ? 'PASSED' : 'FAILED'}`);
  }

  private testEdgeCases(): void {
    const original = new OriginalAggregator();
    const optimized = new OptimizedAggregator();
    
    // Test deletion, updates, and edge cases
    const edgeCaseUpdates = [
      { side: 'buy', price: 100.0000, quantity: 50 },
      { side: 'buy', price: 100.0000, quantity: 75 }, // Update existing
      { side: 'buy', price: 100.0000, quantity: 0 },  // Delete
      { side: 'sell', price: 101.0000, quantity: 0 }, // Delete non-existent
    ];
    
    edgeCaseUpdates.forEach(update => {
      original.handleUpdate(update);
      optimized.handleUpdate(update);
    });
    
    const originalResult = original.getTopLevels(5);
    const optimizedResult = optimized.getTopLevels(5);
    
    const passed = this.compareResults(originalResult, optimizedResult);
    console.log(`✅ Edge Cases: ${passed ? 'PASSED' : 'FAILED'}`);
  }

  private testSortingOrder(): void {
    const original = new OriginalAggregator();
    const optimized = new OptimizedAggregator();
    
    // Test that bids are descending and asks are ascending
    const sortingUpdates = [
      { side: 'buy', price: 100.0000, quantity: 50 },
      { side: 'buy', price: 101.0000, quantity: 30 },
      { side: 'buy', price: 99.0000, quantity: 40 },
      { side: 'sell', price: 102.0000, quantity: 25 },
      { side: 'sell', price: 103.0000, quantity: 35 },
      { side: 'sell', price: 101.5000, quantity: 45 }
    ];
    
    sortingUpdates.forEach(update => {
      original.handleUpdate(update);
      optimized.handleUpdate(update);
    });
    
    const originalResult = original.getTopLevels(10);
    const optimizedResult = optimized.getTopLevels(10);
    
    // Check bid ordering (descending)
    let bidsCorrect = true;
    for (let i = 1; i < optimizedResult.bids.length; i++) {
      if (optimizedResult.bids[i].price > optimizedResult.bids[i-1].price) {
        bidsCorrect = false;
        break;
      }
    }
    
    // Check ask ordering (ascending)
    let asksCorrect = true;
    for (let i = 1; i < optimizedResult.asks.length; i++) {
      if (optimizedResult.asks[i].price < optimizedResult.asks[i-1].price) {
        asksCorrect = false;
        break;
      }
    }
    
    const passed = bidsCorrect && asksCorrect && this.compareResults(originalResult, optimizedResult);
    console.log(`✅ Sorting Order: ${passed ? 'PASSED' : 'FAILED'}`);
  }

  private printResults(): void {
    console.log('\n📊 Performance Benchmark Results:\n');
    console.log('Test Name'.padEnd(30) + 'Original (ms)'.padEnd(15) + 'Optimized (ms)'.padEnd(15) + 'Improvement'.padEnd(15) + 'Status');
    console.log('-'.repeat(80));
    
    let totalImprovement = 0;
    let passedTests = 0;
    
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(
        result.name.padEnd(30) +
        result.originalTime.toFixed(2).padEnd(15) +
        result.optimizedTime.toFixed(2).padEnd(15) +
        `${result.improvement.toFixed(1)}%`.padEnd(15) +
        status
      );
      
      totalImprovement += result.improvement;
      if (result.passed) passedTests++;
    });
    
    const avgImprovement = totalImprovement / this.results.length;
    
    console.log('-'.repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   Tests Passed: ${passedTests}/${this.results.length}`);
    console.log(`   Average Performance Improvement: ${avgImprovement.toFixed(1)}%`);
    console.log(`\n⚠️  Note: For complete requirement validation, run the full evaluation suite:`);
    console.log(`   - Requirement 1: Run 'npm run test:after' for latency/throughput validation`);
    console.log(`   - Requirement 2: Verified by code inspection (Red-Black Tree eliminates Array.sort/findIndex)`);
    console.log(`   - Requirement 3: Run 'npm run evaluate' for heap allocation measurement`);
    console.log(`   - Requirements 5-8: Run 'npm run evaluate' for comprehensive testing\n`);
  }
}

// Main test execution
async function runAllTests(): Promise<void> {
  const tester = new PerformanceTester();
  
  try {
    // Run functional tests first
    tester.runFunctionalTests();
    
    // Run performance benchmarks
    await tester.runBenchmarkSuite();
    
    // Run high-frequency latency test
    await tester.runLatencyTest();
    
    // Run memory leak test (commented out for quick testing, uncomment for full validation)
    await tester.runMemoryLeakTest();
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Export for external usage
export { PerformanceTester, runAllTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}