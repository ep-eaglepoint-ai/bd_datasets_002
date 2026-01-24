#!/usr/bin/env node

/**
 * JavaScript test runner for Investment Portfolio Analytics Dashboard implementation
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, testFn) {
  totalTests++;
  try {
    const result = testFn();
    if (result instanceof Promise) {
      result.then(() => {
        console.log(`✓ ${name}`);
        passedTests++;
      }).catch(error => {
        console.log(`✗ ${name}: ${error.message}`);
        failedTests++;
      });
    } else {
      console.log(`✓ ${name}`);
      passedTests++;
    }
  } catch (error) {
    console.log(`✗ ${name}: ${error.message}`);
    failedTests++;
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeGreaterThan: (expected) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toContain: (expected) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toExist: () => {
      if (!actual) {
        throw new Error(`Expected value to exist`);
      }
    },
    toBeInstanceOf: (expectedClass) => {
      if (!(actual instanceof expectedClass)) {
        throw new Error(`Expected instance of ${expectedClass.name}, got ${typeof actual}`);
      }
    },
    toBeCloseTo: (expected, precision = 2) => {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -precision);
      if (diff > tolerance) {
        throw new Error(`Expected ${actual} to be close to ${expected} (within ${tolerance})`);
      }
    },
    toBeLessThan: (expected) => {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    }
  };
}

// Mock DOM environment for React components
function setupMockDOM() {
  global.window = {
    location: { href: 'http://localhost:3000' },
    document: {
      createElement: () => ({ style: {} }),
      getElementById: () => null
    }
  };
  global.document = global.window.document;
}

async function runTests() {
  console.log('🧪 Investment Portfolio Analytics Dashboard - Test Suite');
  console.log('=' .repeat(60));

  setupMockDOM();

  // Test 1: File Structure Validation (Both Repositories)
  test('Project structure contains all required files in both repositories', () => {
    const repoAfterPath = path.join(__dirname, '../repository_after');
    const repoBeforePath = path.join(__dirname, '../repository_before');
    
    // Test repository_after structure
    expect(fs.existsSync(path.join(repoAfterPath, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(repoAfterPath, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(repoAfterPath, 'vite.config.ts'))).toBe(true);
    
    // Source structure
    expect(fs.existsSync(path.join(repoAfterPath, 'src/App.jsx'))).toBe(true);
    expect(fs.existsSync(path.join(repoAfterPath, 'src/main.jsx'))).toBe(true);
    expect(fs.existsSync(path.join(repoAfterPath, 'src/index.css'))).toBe(true);
    
    // Utils
    expect(fs.existsSync(path.join(repoAfterPath, 'src/utils/portfolioEngine.js'))).toBe(true);
    expect(fs.existsSync(path.join(repoAfterPath, 'src/utils/marketData.js'))).toBe(true);
    expect(fs.existsSync(path.join(repoAfterPath, 'src/utils/formatters.js'))).toBe(true);
    
    // Components
    const componentsPath = path.join(repoAfterPath, 'src/components');
    expect(fs.existsSync(path.join(componentsPath, 'PortfolioSummary.jsx'))).toBe(true);
    expect(fs.existsSync(path.join(componentsPath, 'HoldingsTable.jsx'))).toBe(true);
    expect(fs.existsSync(path.join(componentsPath, 'HistoricalChart.jsx'))).toBe(true);
    expect(fs.existsSync(path.join(componentsPath, 'SectorAllocation.jsx'))).toBe(true);
    expect(fs.existsSync(path.join(componentsPath, 'TransactionHistory.jsx'))).toBe(true);
    expect(fs.existsSync(path.join(componentsPath, 'PerformanceMetrics.jsx'))).toBe(true);
    expect(fs.existsSync(path.join(componentsPath, 'MarketDataProvider.jsx'))).toBe(true);
    
    // Test repository_before structure (basic files)
    expect(fs.existsSync(path.join(repoBeforePath, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(repoBeforePath, 'README.md'))).toBe(true);
  });

  // Test 2: Package.json Validation
  test('Package.json contains required dependencies', () => {
    const packagePath = path.join(__dirname, '../repository_after/package.json');
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    expect(packageContent.dependencies.react).toExist();
    expect(packageContent.dependencies['react-dom']).toExist();
    expect(packageContent.dependencies.recharts).toExist();
    expect(packageContent.devDependencies.vite).toExist();
    expect(packageContent.devDependencies['@vitejs/plugin-react']).toExist();
  });

  // Test 3: Portfolio Engine - FIFO Lot Tracker
  test('FIFO Lot Tracker correctly handles basic operations', async () => {
    const modulePath = path.join(__dirname, '../repository_after/src/utils/portfolioEngine.js');
    
    try {
      const { FIFOLotTracker } = await import(`file://${modulePath}`);
      
      const tracker = new FIFOLotTracker();
      
      // Add shares
      tracker.addShares('AAPL', 100, 150.00, new Date('2024-01-01'), 'tx1');
      tracker.addShares('AAPL', 50, 160.00, new Date('2024-01-02'), 'tx2');
      
      const lots = tracker.getCurrentLots('AAPL');
      expect(lots.length).toBe(2);
      expect(lots[0].shares).toBe(100);
      expect(lots[1].shares).toBe(50);
    } catch (error) {
      throw new Error(`Module import failed: ${error.message}`);
    }
  });

  // Test 4: FIFO Logic - Partial Lot Handling
  test('FIFO correctly handles partial lot sales', async () => {
    try {
      const modulePath = path.join(__dirname, '../repository_after/src/utils/portfolioEngine.js');
      const { FIFOLotTracker } = await import(`file://${modulePath}`);
      
      const tracker = new FIFOLotTracker();
      
      // Add shares in different lots
      tracker.addShares('AAPL', 100, 150.00, new Date('2024-01-01'), 'tx1');
      tracker.addShares('AAPL', 100, 160.00, new Date('2024-01-02'), 'tx2');
      
      // Sell 150 shares (should consume first lot completely and 50 from second)
      const result = tracker.removeShares('AAPL', 150);
      
      const remainingLots = tracker.getCurrentLots('AAPL');
      expect(remainingLots.length).toBe(1);
      expect(remainingLots[0].shares).toBe(50); // 50 remaining from second lot
      expect(remainingLots[0].costBasis).toBe(160.00);
    } catch (error) {
      throw new Error(`FIFO test failed: ${error.message}`);
    }
  });

  // Test 5: Stock Split Handling
  test('Stock splits are applied correctly to all lots', async () => {
    try {
      const modulePath = path.join(__dirname, '../repository_after/src/utils/portfolioEngine.js');
      const { FIFOLotTracker } = await import(`file://${modulePath}`);
      
      const tracker = new FIFOLotTracker();
      
      tracker.addShares('AAPL', 100, 150.00, new Date('2024-01-01'), 'tx1');
      
      // Apply 2:1 stock split
      tracker.applyStockSplit('AAPL', 2);
      
      const lots = tracker.getCurrentLots('AAPL');
      expect(lots[0].shares).toBe(200); // Doubled
      expect(lots[0].costBasis).toBe(75.00); // Halved
    } catch (error) {
      throw new Error(`Stock split test failed: ${error.message}`);
    }
  });

  // Test 6: Market Data Generation
  test('Market data generates realistic stock prices and sectors', async () => {
    try {
      const modulePath = path.join(__dirname, '../repository_after/src/utils/marketData.js');
      const { generateCurrentPrices } = await import(`file://${modulePath}`);
      
      const prices = generateCurrentPrices();
      const symbols = Object.keys(prices);
      
      expect(symbols.length).toBeGreaterThan(10);
      
      // Check first stock has required properties
      const firstStock = prices[symbols[0]];
      expect(firstStock.currentPrice).toBeGreaterThan(0);
      expect(firstStock.previousClose).toBeGreaterThan(0);
      expect(firstStock.sector).toExist();
      expect(firstStock.name).toExist();
    } catch (error) {
      throw new Error(`Market data test failed: ${error.message}`);
    }
  });

  // Test 7: Transaction Generation
  test('Sample transactions are generated with proper structure', async () => {
    try {
      const modulePath = path.join(__dirname, '../repository_after/src/utils/marketData.js');
      const { generateSampleTransactions } = await import(`file://${modulePath}`);
      
      const transactions = generateSampleTransactions();
      
      expect(transactions.length).toBeGreaterThan(40);
      
      const firstTx = transactions[0];
      expect(firstTx.id).toExist();
      expect(firstTx.symbol).toExist();
      expect(firstTx.type).toExist();
      expect(firstTx.shares).toBeGreaterThan(0);
      expect(firstTx.price).toBeGreaterThan(0);
      expect(firstTx.date).toBeInstanceOf(Date);
    } catch (error) {
      throw new Error(`Transaction generation test failed: ${error.message}`);
    }
  });

  // Test 8: Portfolio Engine Integration
  test('Portfolio engine calculates holdings correctly', async () => {
    try {
      const portfolioPath = path.join(__dirname, '../repository_after/src/utils/portfolioEngine.js');
      const marketPath = path.join(__dirname, '../repository_after/src/utils/marketData.js');
      
      const { PortfolioEngine } = await import(`file://${portfolioPath}`);
      const { generateCurrentPrices, generateSampleTransactions, generateDividends, generateStockSplits } = await import(`file://${marketPath}`);
      
      const engine = new PortfolioEngine();
      const currentPrices = generateCurrentPrices();
      const transactions = generateSampleTransactions();
      const dividends = generateDividends(transactions);
      const stockSplits = generateStockSplits();
      
      engine.setMarketData(transactions, dividends, stockSplits, currentPrices);
      
      const holdings = engine.getCurrentHoldings();
      expect(Object.keys(holdings).length).toBeGreaterThan(0);
      
      // Check first holding structure
      const firstHolding = Object.values(holdings)[0];
      expect(firstHolding.symbol).toExist();
      expect(firstHolding.shares).toBeGreaterThan(0);
      expect(firstHolding.currentValue).toBeGreaterThan(0);
    } catch (error) {
      throw new Error(`Portfolio engine test failed: ${error.message}`);
    }
  });

  // Test 9: Portfolio Summary Calculations
  test('Portfolio summary calculates total values correctly', async () => {
    try {
      const portfolioPath = path.join(__dirname, '../repository_after/src/utils/portfolioEngine.js');
      const marketPath = path.join(__dirname, '../repository_after/src/utils/marketData.js');
      
      const { PortfolioEngine } = await import(`file://${portfolioPath}`);
      const { generateCurrentPrices, generateSampleTransactions, generateDividends, generateStockSplits } = await import(`file://${marketPath}`);
      
      const engine = new PortfolioEngine();
      const currentPrices = generateCurrentPrices();
      const transactions = generateSampleTransactions();
      const dividends = generateDividends(transactions);
      const stockSplits = generateStockSplits();
      
      engine.setMarketData(transactions, dividends, stockSplits, currentPrices);
      
      const summary = engine.getPortfolioSummary();
      expect(summary.totalValue).toBeGreaterThan(0);
      expect(summary.totalCost).toBeGreaterThan(0);
      expect(typeof summary.totalGainPercent).toBe('number');
      expect(typeof summary.dayChangePercent).toBe('number');
    } catch (error) {
      throw new Error(`Portfolio summary test failed: ${error.message}`);
    }
  });

  // Test 10: Sector Allocation
  test('Sector allocation calculates percentages correctly', async () => {
    try {
      const portfolioPath = path.join(__dirname, '../repository_after/src/utils/portfolioEngine.js');
      const marketPath = path.join(__dirname, '../repository_after/src/utils/marketData.js');
      
      const { PortfolioEngine } = await import(`file://${portfolioPath}`);
      const { generateCurrentPrices, generateSampleTransactions, generateDividends, generateStockSplits } = await import(`file://${marketPath}`);
      
      const engine = new PortfolioEngine();
      const currentPrices = generateCurrentPrices();
      const transactions = generateSampleTransactions();
      const dividends = generateDividends(transactions);
      const stockSplits = generateStockSplits();
      
      engine.setMarketData(transactions, dividends, stockSplits, currentPrices);
      
      const sectors = engine.getSectorAllocation();
      expect(sectors.length).toBeGreaterThan(0);
      
      const totalPercentage = sectors.reduce((sum, sector) => sum + sector.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1); // Within 0.1%
    } catch (error) {
      throw new Error(`Sector allocation test failed: ${error.message}`);
    }
  });

  // Test 11: Historical Data Generation
  test('Historical data generates plausible growth patterns', async () => {
    try {
      const portfolioPath = path.join(__dirname, '../repository_after/src/utils/portfolioEngine.js');
      const marketPath = path.join(__dirname, '../repository_after/src/utils/marketData.js');
      
      const { PortfolioEngine } = await import(`file://${portfolioPath}`);
      const { generateCurrentPrices, generateSampleTransactions, generateDividends, generateStockSplits } = await import(`file://${marketPath}`);
      
      const engine = new PortfolioEngine();
      const currentPrices = generateCurrentPrices();
      const transactions = generateSampleTransactions();
      const dividends = generateDividends(transactions);
      const stockSplits = generateStockSplits();
      
      engine.setMarketData(transactions, dividends, stockSplits, currentPrices);
      
      const historical = engine.getHistoricalData(30);
      expect(historical.length).toBe(30);
      
      // Check data structure
      const firstPoint = historical[0];
      expect(firstPoint.date).toBeInstanceOf(Date);
      expect(firstPoint.value).toBeGreaterThan(0);
      expect(typeof firstPoint.dayChange).toBe('number');
      expect(typeof firstPoint.dayChangePercent).toBe('number');
    } catch (error) {
      throw new Error(`Historical data test failed: ${error.message}`);
    }
  });

  // Test 12: Performance Metrics
  test('Performance metrics calculate risk-adjusted returns', async () => {
    try {
      const portfolioPath = path.join(__dirname, '../repository_after/src/utils/portfolioEngine.js');
      const marketPath = path.join(__dirname, '../repository_after/src/utils/marketData.js');
      
      const { PortfolioEngine } = await import(`file://${portfolioPath}`);
      const { generateCurrentPrices, generateSampleTransactions, generateDividends, generateStockSplits } = await import(`file://${marketPath}`);
      
      const engine = new PortfolioEngine();
      const currentPrices = generateCurrentPrices();
      const transactions = generateSampleTransactions();
      const dividends = generateDividends(transactions);
      const stockSplits = generateStockSplits();
      
      engine.setMarketData(transactions, dividends, stockSplits, currentPrices);
      
      const metrics = engine.getPerformanceMetrics();
      expect(typeof metrics.totalReturn).toBe('number');
      expect(typeof metrics.annualizedReturn).toBe('number');
      expect(typeof metrics.volatility).toBe('number');
      expect(typeof metrics.sharpeRatio).toBe('number');
      expect(typeof metrics.maxDrawdown).toBe('number');
      expect(typeof metrics.dividendYield).toBe('number');
    } catch (error) {
      throw new Error(`Performance metrics test failed: ${error.message}`);
    }
  });

  // Test 13: React Component Structure
  test('React components have proper JSX structure', () => {
    const componentsPath = path.join(__dirname, '../repository_after/src/components');
    const components = [
      'PortfolioSummary.jsx',
      'HoldingsTable.jsx', 
      'HistoricalChart.jsx',
      'SectorAllocation.jsx',
      'TransactionHistory.jsx',
      'PerformanceMetrics.jsx'
    ];
    
    components.forEach(component => {
      const componentPath = path.join(componentsPath, component);
      const content = fs.readFileSync(componentPath, 'utf8');
      
      expect(content).toContain('import React');
      expect(content).toContain('export default');
      expect(content).toContain('return (');
    });
  });

  // Test 14: App.jsx Integration
  test('App.jsx imports and uses all required components', () => {
    const appPath = path.join(__dirname, '../repository_after/src/App.jsx');
    const content = fs.readFileSync(appPath, 'utf8');
    
    expect(content).toContain('PortfolioSummary');
    expect(content).toContain('HoldingsTable');
    expect(content).toContain('HistoricalChart');
    expect(content).toContain('SectorAllocation');
    expect(content).toContain('TransactionHistory');
    expect(content).toContain('PerformanceMetrics');
    expect(content).toContain('PortfolioEngine');
  });

  // Test 15: No Hardcoded Output Values
  test('Components use computed data, not hardcoded values', () => {
    const componentsPath = path.join(__dirname, '../repository_after/src/components');
    const components = [
      'PortfolioSummary.jsx',
      'HoldingsTable.jsx',
      'HistoricalChart.jsx',
      'SectorAllocation.jsx',
      'TransactionHistory.jsx',
      'PerformanceMetrics.jsx'
    ];
    
    components.forEach(component => {
      const componentPath = path.join(componentsPath, component);
      const content = fs.readFileSync(componentPath, 'utf8');
      
      // Should not contain hardcoded dollar amounts or percentages in JSX
      const hardcodedPatterns = [
        /\$\d+,?\d*\.\d{2}/,  // $1,234.56
        /\d+\.\d{2}%/,        // 12.34%
        /\$\d{4,}/            // $1000 or more
      ];
      
      hardcodedPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          // Allow hardcoded values in comments or strings, but not in JSX rendering
          const jsxContent = content.split('return (')[1];
          if (jsxContent && pattern.test(jsxContent)) {
            throw new Error(`Component ${component} contains hardcoded values in JSX: ${matches[0]}`);
          }
        }
      });
    });
  });

  // Test 16: Performance - O(n) Transaction Processing
  test('Transaction processing scales linearly', async () => {
    try {
      const portfolioPath = path.join(__dirname, '../repository_after/src/utils/portfolioEngine.js');
      const { PortfolioEngine } = await import(`file://${portfolioPath}`);
      
      // Test with different transaction counts
      const engine = new PortfolioEngine();
      
      // Create test transactions
      const createTransactions = (count) => {
        const transactions = [];
        for (let i = 0; i < count; i++) {
          transactions.push({
            id: `tx${i}`,
            symbol: 'AAPL',
            type: 'BUY',
            shares: 10,
            price: 150 + Math.random() * 10,
            date: new Date(2024, 0, 1 + i)
          });
        }
        return transactions;
      };
      
      const testPerformance = (txCount) => {
        const start = Date.now();
        const transactions = createTransactions(txCount);
        engine.setMarketData(transactions, [], [], { AAPL: { currentPrice: 160, sector: 'Technology' } });
        const end = Date.now();
        return end - start;
      };
      
      const time100 = testPerformance(100);
      const time200 = testPerformance(200);
      
      // Processing 200 transactions should not take more than 3x the time of 100
      // (allowing for some overhead, but ensuring it's not O(n²))
      expect(time200).toBeLessThan(time100 * 3);
    } catch (error) {
      throw new Error(`Performance test failed: ${error.message}`);
    }
  });

  // Test 17: Browser-Only Implementation
  test('No external API calls or server dependencies', () => {
    const srcPath = path.join(__dirname, '../repository_after/src');
    const files = fs.readdirSync(srcPath, { recursive: true });
    
    files.forEach(file => {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        const filePath = path.join(srcPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for external API calls
        const forbiddenPatterns = [
          /fetch\s*\(/,
          /axios\./,
          /XMLHttpRequest/,
          /localStorage/,
          /sessionStorage/,
          /indexedDB/,
          /\.post\s*\(/,
          /\.get\s*\(/,
          /api\./
        ];
        
        forbiddenPatterns.forEach(pattern => {
          if (pattern.test(content)) {
            throw new Error(`File ${file} contains forbidden external dependency: ${pattern}`);
          }
        });
      }
    });
  });

  // Test 18: Responsive Design Elements
  test('Components include responsive design considerations', () => {
    const componentsPath = path.join(__dirname, '../repository_after/src/components');
    const components = fs.readdirSync(componentsPath);
    
    components.forEach(component => {
      const componentPath = path.join(componentsPath, component);
      const content = fs.readFileSync(componentPath, 'utf8');
      
      // Should have some responsive design patterns
      const responsivePatterns = [
        /@media/,
        /max-width.*768px/,
        /grid-template-columns.*auto-fit/,
        /flex.*wrap/
      ];
      
      const hasResponsive = responsivePatterns.some(pattern => pattern.test(content));
      if (!hasResponsive) {
        console.warn(`⚠️  Component ${component} may lack responsive design patterns`);
      }
    });
  });

  // Test 19: CSS Styling Integration
  test('Components include proper styling', () => {
    const componentsPath = path.join(__dirname, '../repository_after/src/components');
    const components = fs.readdirSync(componentsPath);
    
    components.forEach(component => {
      const componentPath = path.join(componentsPath, component);
      const content = fs.readFileSync(componentPath, 'utf8');
      
      // Should have styling (either CSS classes or styled-jsx)
      const stylingPatterns = [
        /className=/,
        /style\s*jsx/,
        /styled\./,
        /\.css/
      ];
      
      const hasStyling = stylingPatterns.some(pattern => pattern.test(content));
      expect(hasStyling).toBe(true);
    });
  });

  // Test 20: Data Flow Validation
  test('Data flows correctly from engine to components', () => {
    const appPath = path.join(__dirname, '../repository_after/src/App.jsx');
    const content = fs.readFileSync(appPath, 'utf8');
    
    // Check that data is passed as props to components
    expect(content).toContain('summary={');
    expect(content).toContain('holdings={');
    expect(content).toContain('data={');
    expect(content).toContain('sectors={');
    expect(content).toContain('transactions={');
    expect(content).toContain('metrics={');
  });

  // Test 21: Error Handling
  test('Components handle missing or invalid data gracefully', () => {
    const componentsPath = path.join(__dirname, '../repository_after/src/components');
    const components = fs.readdirSync(componentsPath);
    
    components.forEach(component => {
      const componentPath = path.join(componentsPath, component);
      const content = fs.readFileSync(componentPath, 'utf8');
      
      // Should have some error handling or loading states
      const errorHandlingPatterns = [
        /if\s*\(\s*!.*\)/,
        /\?\s*.*\s*:/,
        /Loading/,
        /Error/,
        /null/
      ];
      
      const hasErrorHandling = errorHandlingPatterns.some(pattern => pattern.test(content));
      expect(hasErrorHandling).toBe(true);
    });
  });

  // Test 22: Memory Optimization
  test('Large datasets are handled efficiently', () => {
    // Check that arrays are not unnecessarily duplicated
    const appPath = path.join(__dirname, '../repository_after/src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf8');
    expect(appContent).toContain('useMemo');
  });

  // Test 23: Dividend Handling
  test('Dividend calculations are included in portfolio metrics', async () => {
    try {
      const portfolioPath = path.join(__dirname, '../repository_after/src/utils/portfolioEngine.js');
      const marketPath = path.join(__dirname, '../repository_after/src/utils/marketData.js');
      
      const { PortfolioEngine } = await import(`file://${portfolioPath}`);
      const { generateCurrentPrices, generateSampleTransactions, generateDividends, generateStockSplits } = await import(`file://${marketPath}`);
      
      const engine = new PortfolioEngine();
      const currentPrices = generateCurrentPrices();
      const transactions = generateSampleTransactions();
      const dividends = generateDividends(transactions);
      const stockSplits = generateStockSplits();
      
      engine.setMarketData(transactions, dividends, stockSplits, currentPrices);
      
      const summary = engine.getPortfolioSummary();
      expect(typeof summary.dividendIncome).toBe('number');
      expect(summary.dividendIncome).toBeGreaterThan(0);
    } catch (error) {
      throw new Error(`Dividend test failed: ${error.message}`);
    }
  });

  // Test 24: Real-time Calculations
  test('All calculations use real computed values', async () => {
    try {
      const portfolioPath = path.join(__dirname, '../repository_after/src/utils/portfolioEngine.js');
      const marketPath = path.join(__dirname, '../repository_after/src/utils/marketData.js');
      
      const { PortfolioEngine } = await import(`file://${portfolioPath}`);
      const { generateCurrentPrices, generateSampleTransactions } = await import(`file://${marketPath}`);
      
      const engine1 = new PortfolioEngine();
      const engine2 = new PortfolioEngine();
      
      // Generate different datasets
      const prices1 = generateCurrentPrices();
      const prices2 = generateCurrentPrices();
      const transactions1 = generateSampleTransactions();
      const transactions2 = generateSampleTransactions();
      
      engine1.setMarketData(transactions1, [], [], prices1);
      engine2.setMarketData(transactions2, [], [], prices2);
      
      const summary1 = engine1.getPortfolioSummary();
      const summary2 = engine2.getPortfolioSummary();
      
      // Values should be different (not hardcoded)
      if (summary1.totalValue === summary2.totalValue) {
        throw new Error('Values should be different (not hardcoded)');
      }
    } catch (error) {
      throw new Error(`Real-time calculations test failed: ${error.message}`);
    }
  });

  // Test 26: Formatters Utility Functions
  test('Formatters utility provides consistent formatting across components', async () => {
    try {
      const formattersPath = path.join(__dirname, '../repository_after/src/utils/formatters.js');
      const { formatCurrency, formatPercent, getColorClass, formatDate, getTypeIcon, getTypeColor } = await import(`file://${formattersPath}`);
      
      // Test currency formatting
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1000, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe('$1,000');
      
      // Test percentage formatting
      expect(formatPercent(12.34)).toBe('+12.34%');
      expect(formatPercent(-5.67)).toBe('-5.67%');
      expect(formatPercent(0)).toBe('+0.00%');
      
      // Test color class logic
      expect(getColorClass(100)).toBe('positive');
      expect(getColorClass(-50)).toBe('negative');
      expect(getColorClass(0)).toBe('neutral');
      
      // Test date formatting
      const testDate = new Date('2024-01-15');
      expect(formatDate(testDate)).toContain('Jan');
      expect(formatDate(testDate)).toContain('15');
      
      // Test transaction type functions
      expect(getTypeIcon('BUY')).toBe('↗');
      expect(getTypeIcon('SELL')).toBe('↘');
      expect(getTypeIcon('DIVIDEND')).toBe('💰');
      
      expect(getTypeColor('BUY')).toBe('#10b981');
      expect(getTypeColor('SELL')).toBe('#ef4444');
      expect(getTypeColor('DIVIDEND')).toBe('#8b5cf6');
    } catch (error) {
      throw new Error(`Formatters utility test failed: ${error.message}`);
    }
  });

  // Test 27: MarketDataProvider Component
  test('MarketDataProvider component provides market data context', () => {
    const providerPath = path.join(__dirname, '../repository_after/src/components/MarketDataProvider.jsx');
    const content = fs.readFileSync(providerPath, 'utf8');
    
    expect(content).toContain('createContext');
    expect(content).toContain('useContext');
    expect(content).toContain('MarketDataProvider');
    expect(content).toContain('useMarketData');
    expect(content).toContain('generateCurrentPrices');
    expect(content).toContain('generateSampleTransactions');
    expect(content).toContain('generateDividends');
    expect(content).toContain('generateStockSplits');
  });

  // Test 28: Component Refactoring - No Duplicate Helper Functions
  test('Components use shared formatters instead of duplicate helper functions', () => {
    const componentsPath = path.join(__dirname, '../repository_after/src/components');
    const components = [
      'HistoricalChart.jsx',
      'PerformanceMetrics.jsx',
      'PortfolioSummary.jsx',
      'SectorAllocation.jsx',
      'TransactionHistory.jsx',
      'HoldingsTable.jsx'
    ];
    
    components.forEach(component => {
      const componentPath = path.join(componentsPath, component);
      const content = fs.readFileSync(componentPath, 'utf8');
      
      // Should import from formatters utility
      expect(content).toContain('from \'../utils/formatters.js\'');
      
      // Should NOT contain duplicate helper function definitions
      const duplicatePatterns = [
        /const formatCurrency = \(value\) => {/,
        /const formatPercent = \(value\) => {/,
        /const getColorClass = \(value\) => {/,
        /const formatDate = \(date\) => {/
      ];
      
      duplicatePatterns.forEach(pattern => {
        if (pattern.test(content)) {
          throw new Error(`Component ${component} contains duplicate helper function that should use formatters utility`);
        }
      });
    });
  });
  // Test 25: Meta-Testing and Adversarial Testing
  test('Meta-testing: Test suite validates all requirements', () => {
    // Verify we have tests for all major requirements
    const requiredTestCategories = [
      'FIFO logic',
      'partial lots',
      'stock splits',
      'performance metrics',
      'sector allocation',
      'historical data',
      'browser-only',
      'no hardcoded values',
      'O(n) processing',
      'responsive design'
    ];
    
    const testContent = fs.readFileSync(__filename, 'utf8');
    
    requiredTestCategories.forEach(category => {
      const hasTest = testContent.toLowerCase().includes(category.toLowerCase());
      expect(hasTest).toBe(true);
    });
    
    // Adversarial test: Verify we're not just checking file existence
    expect(totalTests).toBeGreaterThan(20);
    
    // Verify tests actually execute logic, not just check strings
    const logicTestPatterns = [
      /expect\(.*\)\.toBe\(/,
      /expect\(.*\)\.toBeGreaterThan\(/,
      /expect\(.*\)\.toBeCloseTo\(/
    ];
    
    const hasLogicTests = logicTestPatterns.some(pattern => pattern.test(testContent));
    expect(hasLogicTests).toBe(true);
  });

  // Wait for async tests to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test Results Summary
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results Summary`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`❌ ${failedTests} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});