// Market data simulation utilities - all data generated in memory

// Sample stock universe with realistic data
export const STOCK_UNIVERSE = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', basePrice: 175.00 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', basePrice: 380.00 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', basePrice: 140.00 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', basePrice: 155.00 },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', basePrice: 250.00 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', basePrice: 480.00 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', basePrice: 155.00 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 165.00 },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financials', basePrice: 250.00 },
  { symbol: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer Staples', basePrice: 155.00 },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Healthcare', basePrice: 520.00 },
  { symbol: 'HD', name: 'Home Depot Inc.', sector: 'Consumer Discretionary', basePrice: 320.00 },
  { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financials', basePrice: 380.00 },
  { symbol: 'BAC', name: 'Bank of America Corp.', sector: 'Financials', basePrice: 32.00 },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', basePrice: 110.00 },
  { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', basePrice: 155.00 },
  { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy', basePrice: 160.00 },
  { symbol: 'LLY', name: 'Eli Lilly and Company', sector: 'Healthcare', basePrice: 580.00 },
  { symbol: 'KO', name: 'Coca-Cola Company', sector: 'Consumer Staples', basePrice: 60.00 },
  { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Staples', basePrice: 170.00 }
];

// Sector colors for visualization
export const SECTOR_COLORS = {
  'Technology': '#4285f4',
  'Healthcare': '#34a853',
  'Financials': '#fbbc04',
  'Consumer Discretionary': '#ea4335',
  'Consumer Staples': '#9c27b0',
  'Energy': '#ff9800',
  'Industrials': '#795548',
  'Materials': '#607d8b',
  'Utilities': '#009688',
  'Real Estate': '#e91e63'
};

// Generate realistic price movements using geometric Brownian motion
export function generatePriceHistory(basePrice, days = 365, volatility = 0.2, drift = 0.08) {
  const prices = [basePrice];
  const dt = 1 / 365; // Daily time step
  
  for (let i = 1; i < days; i++) {
    const randomShock = (Math.random() - 0.5) * 2; // Random between -1 and 1
    const priceChange = drift * dt + volatility * Math.sqrt(dt) * randomShock;
    const newPrice = prices[i - 1] * (1 + priceChange);
    prices.push(Math.max(newPrice, 0.01)); // Prevent negative prices
  }
  
  return prices;
}

// Generate current market prices with daily changes
export function generateCurrentPrices() {
  const currentDate = new Date();
  const prices = {};
  
  STOCK_UNIVERSE.forEach(stock => {
    const priceHistory = generatePriceHistory(stock.basePrice, 2);
    const currentPrice = priceHistory[1];
    const previousClose = priceHistory[0];
    
    prices[stock.symbol] = {
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      currentPrice: Math.round(currentPrice * 100) / 100,
      previousClose: Math.round(previousClose * 100) / 100,
      change: Math.round((currentPrice - previousClose) * 100) / 100,
      changePercent: Math.round(((currentPrice - previousClose) / previousClose) * 10000) / 100
    };
  });
  
  return prices;
}

// Generate sample transactions with realistic patterns
export function generateSampleTransactions() {
  const transactions = [];
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2); // 2 years of history
  
  let transactionId = 1;
  
  // Generate initial purchases for more stocks
  STOCK_UNIVERSE.slice(0, 12).forEach((stock, index) => {
    const purchaseDate = new Date(startDate);
    purchaseDate.setDate(purchaseDate.getDate() + index * 20);
    
    // Initial purchase
    transactions.push({
      id: `txn_${transactionId++}`,
      symbol: stock.symbol,
      type: 'BUY',
      shares: Math.floor(Math.random() * 100) + 50,
      price: stock.basePrice * (0.9 + Math.random() * 0.2), // ±10% from base
      date: new Date(purchaseDate),
      fees: 9.99
    });
    
    // Additional purchases over time
    for (let i = 0; i < Math.floor(Math.random() * 4) + 2; i++) {
      const additionalDate = new Date(purchaseDate);
      additionalDate.setDate(additionalDate.getDate() + (i + 1) * 60);
      
      if (additionalDate < new Date()) {
        transactions.push({
          id: `txn_${transactionId++}`,
          symbol: stock.symbol,
          type: 'BUY',
          shares: Math.floor(Math.random() * 50) + 25,
          price: stock.basePrice * (0.85 + Math.random() * 0.3),
          date: new Date(additionalDate),
          fees: 9.99
        });
      }
    }
    
    // Occasional sales
    if (Math.random() > 0.7) {
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 180));
      
      transactions.push({
        id: `txn_${transactionId++}`,
        symbol: stock.symbol,
        type: 'SELL',
        shares: Math.floor(Math.random() * 30) + 10,
        price: stock.basePrice * (0.9 + Math.random() * 0.2),
        date: new Date(saleDate),
        fees: 9.99
      });
    }
  });
  
  return transactions.sort((a, b) => a.date - b.date);
}

// Generate dividend payments
export function generateDividends(transactions) {
  const dividends = [];
  const dividendYields = {
    'AAPL': 0.005, 'MSFT': 0.007, 'GOOGL': 0.000, 'AMZN': 0.000,
    'TSLA': 0.000, 'NVDA': 0.001, 'JPM': 0.025, 'JNJ': 0.026,
    'V': 0.007, 'PG': 0.024
  };
  
  let dividendId = 1;
  
  // Calculate holdings at different points in time for dividend calculations
  const quarterlyDates = [];
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2);
  
  for (let i = 0; i < 8; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i * 3);
    if (date < new Date()) {
      quarterlyDates.push(date);
    }
  }
  
  quarterlyDates.forEach(date => {
    const holdingsAtDate = calculateHoldingsAtDate(transactions, date);
    
    Object.entries(holdingsAtDate).forEach(([symbol, holding]) => {
      const yield_ = dividendYields[symbol] || 0;
      if (yield_ > 0 && holding.shares > 0) {
        const stock = STOCK_UNIVERSE.find(s => s.symbol === symbol);
        const quarterlyDividend = (stock.basePrice * yield_) / 4;
        
        dividends.push({
          id: `div_${dividendId++}`,
          symbol,
          amount: Math.round(quarterlyDividend * holding.shares * 100) / 100,
          date: new Date(date),
          sharesOwned: holding.shares
        });
      }
    });
  });
  
  return dividends.sort((a, b) => a.date - b.date);
}

// Generate stock splits
export function generateStockSplits() {
  const splits = [];
  const splitDate = new Date();
  splitDate.setFullYear(splitDate.getFullYear() - 1);
  splitDate.setMonth(6); // July of last year
  
  // AAPL had a 4:1 split
  splits.push({
    id: 'split_1',
    symbol: 'AAPL',
    ratio: 4,
    date: new Date(splitDate)
  });
  
  // TSLA had a 3:1 split
  const teslaSplitDate = new Date(splitDate);
  teslaSplitDate.setMonth(8); // September
  splits.push({
    id: 'split_2',
    symbol: 'TSLA',
    ratio: 3,
    date: new Date(teslaSplitDate)
  });
  
  return splits;
}

// Helper function to calculate holdings at a specific date
function calculateHoldingsAtDate(transactions, targetDate) {
  const holdings = {};
  
  transactions
    .filter(t => t.date <= targetDate)
    .forEach(transaction => {
      if (!holdings[transaction.symbol]) {
        holdings[transaction.symbol] = { shares: 0, totalCost: 0 };
      }
      
      if (transaction.type === 'BUY') {
        holdings[transaction.symbol].shares += transaction.shares;
        holdings[transaction.symbol].totalCost += (transaction.shares * transaction.price) + transaction.fees;
      } else if (transaction.type === 'SELL') {
        holdings[transaction.symbol].shares -= transaction.shares;
        // For simplicity, reduce total cost proportionally
        const sellRatio = transaction.shares / (holdings[transaction.symbol].shares + transaction.shares);
        holdings[transaction.symbol].totalCost *= (1 - sellRatio);
      }
    });
  
  return holdings;
}