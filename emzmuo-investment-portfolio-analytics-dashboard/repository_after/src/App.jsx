import React, { useState, useEffect, useMemo } from 'react';
import { PortfolioEngine } from './utils/portfolioEngine.js';
import { SECTOR_COLORS } from './utils/marketData.js';
import MarketDataProvider, { useMarketData } from './components/MarketDataProvider.jsx';
import PortfolioSummary from './components/PortfolioSummary.jsx';
import HoldingsTable from './components/HoldingsTable.jsx';
import HistoricalChart from './components/HistoricalChart.jsx';
import SectorAllocation from './components/SectorAllocation.jsx';
import TransactionHistory from './components/TransactionHistory.jsx';
import PerformanceMetrics from './components/PerformanceMetrics.jsx';

// Main dashboard component that uses market data
function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const marketData = useMarketData();
  
  // Initialize portfolio engine with market data
  const portfolioEngine = useMemo(() => {
    console.log('Initializing portfolio engine...');
    
    const engine = new PortfolioEngine();
    engine.setMarketData(
      marketData.transactions, 
      marketData.dividends, 
      marketData.stockSplits, 
      marketData.currentPrices
    );
    
    return engine;
  }, [marketData]);
  
  // Calculate all portfolio metrics (memoized for performance)
  const portfolioMetrics = useMemo(() => {
    if (!portfolioEngine) return null;
    
    console.log('Calculating portfolio metrics...');
    
    const holdings = portfolioEngine.getCurrentHoldings();
    const summary = portfolioEngine.getPortfolioSummary();
    const sectorAllocation = portfolioEngine.getSectorAllocation();
    const historicalData = portfolioEngine.getHistoricalData(365);
    const performanceMetrics = portfolioEngine.getPerformanceMetrics();
    
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
  }, [portfolioEngine]);
  
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
            currentPrices={marketData.currentPrices}
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
            transactions={marketData.transactions.slice(-10)} 
            dividends={marketData.dividends.slice(-5)}
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

// Main App component with MarketDataProvider wrapper
function App() {
  return (
    <MarketDataProvider>
      <Dashboard />
    </MarketDataProvider>
  );
}

export default App;