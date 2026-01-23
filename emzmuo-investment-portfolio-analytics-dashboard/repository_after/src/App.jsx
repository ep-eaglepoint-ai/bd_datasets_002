import React, { useState, useEffect, useMemo } from 'react';
import { PortfolioEngine } from './utils/portfolioEngine.js';
import { 
  generateCurrentPrices, 
  generateSampleTransactions, 
  generateDividends, 
  generateStockSplits,
  SECTOR_COLORS 
} from './utils/marketData.js';
import PortfolioSummary from './components/PortfolioSummary.jsx';
import HoldingsTable from './components/HoldingsTable.jsx';
import HistoricalChart from './components/HistoricalChart.jsx';
import SectorAllocation from './components/SectorAllocation.jsx';
import TransactionHistory from './components/TransactionHistory.jsx';
import PerformanceMetrics from './components/PerformanceMetrics.jsx';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize portfolio engine and data
  const portfolioData = useMemo(() => {
    console.log('Generating portfolio data...');
    
    // Generate all market data
    const currentPrices = generateCurrentPrices();
    const transactions = generateSampleTransactions();
    const dividends = generateDividends(transactions);
    const stockSplits = generateStockSplits();
    
    // Initialize portfolio engine
    const engine = new PortfolioEngine();
    engine.setMarketData(transactions, dividends, stockSplits, currentPrices);
    
    return {
      engine,
      transactions,
      dividends,
      stockSplits,
      currentPrices
    };
  }, []);
  
  // Calculate all portfolio metrics (memoized for performance)
  const portfolioMetrics = useMemo(() => {
    if (!portfolioData.engine) return null;
    
    console.log('Calculating portfolio metrics...');
    
    const holdings = portfolioData.engine.getCurrentHoldings();
    const summary = portfolioData.engine.getPortfolioSummary();
    const sectorAllocation = portfolioData.engine.getSectorAllocation();
    const historicalData = portfolioData.engine.getHistoricalData(365);
    const performanceMetrics = portfolioData.engine.getPerformanceMetrics();
    
    return {
      holdings,
      summary,
      sectorAllocation: sectorAllocation.map(sector => ({
        ...sector,
        color: SECTOR_COLORS[sector.sector] || '#666666'
      })),
      historicalData,
      performanceMetrics
    };
  }, [portfolioData]);
  
  // Simulate loading delay to show the app is working
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Investment Portfolio Analytics</h1>
          <p>Loading portfolio data...</p>
        </div>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ 
            display: 'inline-block', 
            width: '50px', 
            height: '50px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }
  
  if (!portfolioMetrics) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Investment Portfolio Analytics</h1>
          <p>Error loading portfolio data</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Investment Portfolio Analytics Dashboard</h1>
        <p>Real-time portfolio analysis with FIFO lot tracking and performance metrics</p>
      </div>
      
      <div className="dashboard-grid">
        {/* Portfolio Summary - Section 1 */}
        <div className="dashboard-section">
          <h2 className="section-title">Portfolio Summary</h2>
          <PortfolioSummary summary={portfolioMetrics.summary} />
        </div>
        
        {/* Performance Metrics - Section 2 */}
        <div className="dashboard-section">
          <h2 className="section-title">Performance Metrics</h2>
          <PerformanceMetrics metrics={portfolioMetrics.performanceMetrics} />
        </div>
        
        {/* Holdings Table - Section 3 */}
        <div className="dashboard-section" style={{ gridColumn: '1 / -1' }}>
          <h2 className="section-title">Current Holdings</h2>
          <HoldingsTable 
            holdings={portfolioMetrics.holdings} 
            currentPrices={portfolioData.currentPrices}
          />
        </div>
        
        {/* Historical Chart - Section 4 */}
        <div className="dashboard-section" style={{ gridColumn: '1 / -1' }}>
          <h2 className="section-title">Portfolio Value History</h2>
          <HistoricalChart data={portfolioMetrics.historicalData} />
        </div>
        
        {/* Sector Allocation - Section 5 */}
        <div className="dashboard-section">
          <h2 className="section-title">Sector Allocation</h2>
          <SectorAllocation sectors={portfolioMetrics.sectorAllocation} />
        </div>
        
        {/* Transaction History - Section 6 */}
        <div className="dashboard-section">
          <h2 className="section-title">Recent Transactions</h2>
          <TransactionHistory 
            transactions={portfolioData.transactions.slice(-10)} 
            dividends={portfolioData.dividends.slice(-5)}
          />
        </div>
      </div>
      
      <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '0.9rem' }}>
        <p>
          All data is simulated and generated in-memory. No external APIs or storage used.
          <br />
          FIFO lot tracking • Real-time calculations • Responsive design
        </p>
      </div>
    </div>
  );
}

export default App;