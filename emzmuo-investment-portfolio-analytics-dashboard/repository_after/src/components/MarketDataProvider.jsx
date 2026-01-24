import React, { createContext, useContext, useMemo } from 'react';
import { 
  generateCurrentPrices, 
  generateSampleTransactions, 
  generateDividends, 
  generateStockSplits 
} from '../utils/marketData.js';

// Create context for market data
const MarketDataContext = createContext();

/**
 * Market Data Provider Component
 * Centralizes market data generation and provides it to child components
 */
export const MarketDataProvider = ({ children }) => {
  // Generate all market data once and memoize it
  const marketData = useMemo(() => {
    const currentPrices = generateCurrentPrices();
    const transactions = generateSampleTransactions();
    const dividends = generateDividends(transactions);
    const stockSplits = generateStockSplits();
    
    return {
      currentPrices,
      transactions,
      dividends,
      stockSplits
    };
  }, []); // Empty dependency array means this only runs once

  if (!marketData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <p>Loading market data...</p>
      </div>
    );
  }

  return (
    <MarketDataContext.Provider value={marketData}>
      {children}
      <style jsx>{`
        @media (max-width: 768px) {
          .market-data-provider {
            padding: 10px;
          }
        }
      `}</style>
    </MarketDataContext.Provider>
  );
};

/**
 * Custom hook to access market data
 * @returns {object} Market data object containing prices, transactions, dividends, and splits
 */
export const useMarketData = () => {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }
  return context;
};

export default MarketDataProvider;