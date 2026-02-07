// Portfolio calculation engine with FIFO logic and performance optimization

// FIFO (First In, First Out) lot tracking for tax calculations
export class FIFOLotTracker {
  constructor() {
    this.lots = {}; // symbol -> array of lots
  }
  
  // Add shares to lot tracking (buy transaction)
  addShares(symbol, shares, price, date, transactionId) {
    if (!this.lots[symbol]) {
      this.lots[symbol] = [];
    }
    
    this.lots[symbol].push({
      shares,
      costBasis: price,
      purchaseDate: date,
      transactionId,
      remainingShares: shares
    });
  }
  
  // Remove shares using FIFO logic (sell transaction)
  removeShares(symbol, sharesToSell) {
    if (!this.lots[symbol] || this.lots[symbol].length === 0) {
      return { realizedGain: 0, soldLots: [] };
    }
    
    let remainingToSell = sharesToSell;
    let realizedGain = 0;
    const soldLots = [];
    
    // Process lots in FIFO order
    for (let i = 0; i < this.lots[symbol].length && remainingToSell > 0; i++) {
      const lot = this.lots[symbol][i];
      
      if (lot.remainingShares > 0) {
        const sharesToSellFromLot = Math.min(remainingToSell, lot.remainingShares);
        
        soldLots.push({
          shares: sharesToSellFromLot,
          costBasis: lot.costBasis,
          purchaseDate: lot.purchaseDate
        });
        
        lot.remainingShares -= sharesToSellFromLot;
        remainingToSell -= sharesToSellFromLot;
      }
    }
    
    // Clean up empty lots
    this.lots[symbol] = this.lots[symbol].filter(lot => lot.remainingShares > 0);
    
    return { realizedGain, soldLots };
  }
  
  // Get current lots for a symbol
  getCurrentLots(symbol) {
    if (!this.lots[symbol]) return [];
    
    return this.lots[symbol]
      .filter(lot => lot.remainingShares > 0)
      .map(lot => ({
        shares: lot.remainingShares,
        costBasis: lot.costBasis,
        purchaseDate: lot.purchaseDate,
        transactionId: lot.transactionId
      }));
  }
  
  // Apply stock split to all lots
  applyStockSplit(symbol, ratio) {
    if (!this.lots[symbol]) return;
    
    this.lots[symbol].forEach(lot => {
      lot.shares *= ratio;
      lot.remainingShares *= ratio;
      lot.costBasis /= ratio;
    });
  }
}

// Main portfolio calculation engine
export class PortfolioEngine {
  constructor() {
    this.lotTracker = new FIFOLotTracker();
    this.transactions = [];
    this.dividends = [];
    this.stockSplits = [];
    this.currentPrices = {};
  }
  
  // Set market data
  setMarketData(transactions, dividends, stockSplits, currentPrices) {
    this.transactions = [...transactions].sort((a, b) => a.date - b.date);
    this.dividends = [...dividends].sort((a, b) => a.date - b.date);
    this.stockSplits = [...stockSplits].sort((a, b) => a.date - b.date);
    this.currentPrices = { ...currentPrices };
    
    this.processAllTransactions();
  }
  
  // Process all transactions in chronological order - O(n) complexity
  processAllTransactions() {
    this.lotTracker = new FIFOLotTracker();
    
    // Create combined timeline of transactions and splits
    const timeline = [
      ...this.transactions.map(t => ({ ...t, type: t.type, eventType: 'transaction' })),
      ...this.stockSplits.map(s => ({ ...s, eventType: 'split' }))
    ].sort((a, b) => a.date - b.date);
    
    // Process events in chronological order
    timeline.forEach(event => {
      if (event.eventType === 'transaction') {
        if (event.type === 'BUY') {
          this.lotTracker.addShares(
            event.symbol,
            event.shares,
            event.price,
            event.date,
            event.id
          );
        } else if (event.type === 'SELL') {
          this.lotTracker.removeShares(event.symbol, event.shares);
        }
      } else if (event.eventType === 'split') {
        this.lotTracker.applyStockSplit(event.symbol, event.ratio);
      }
    });
  }
  
  // Calculate current holdings
  getCurrentHoldings() {
    const holdings = {};
    
    // Get all symbols with current lots
    Object.keys(this.lotTracker.lots).forEach(symbol => {
      const lots = this.lotTracker.getCurrentLots(symbol);
      
      if (lots.length > 0) {
        const totalShares = lots.reduce((sum, lot) => sum + lot.shares, 0);
        const totalCost = lots.reduce((sum, lot) => sum + (lot.shares * lot.costBasis), 0);
        const averageCost = totalCost / totalShares;
        
        const currentPrice = this.currentPrices[symbol]?.currentPrice || 0;
        const currentValue = totalShares * currentPrice;
        const unrealizedGain = currentValue - totalCost;
        const unrealizedGainPercent = totalCost > 0 ? (unrealizedGain / totalCost) * 100 : 0;
        
        holdings[symbol] = {
          symbol,
          shares: Math.round(totalShares * 100) / 100,
          averageCost: Math.round(averageCost * 100) / 100,
          currentValue: Math.round(currentValue * 100) / 100,
          totalCost: Math.round(totalCost * 100) / 100,
          unrealizedGain: Math.round(unrealizedGain * 100) / 100,
          unrealizedGainPercent: Math.round(unrealizedGainPercent * 100) / 100,
          lots: lots.map(lot => ({
            ...lot,
            shares: Math.round(lot.shares * 100) / 100,
            costBasis: Math.round(lot.costBasis * 100) / 100
          }))
        };
      }
    });
    
    return holdings;
  }
  
  // Calculate portfolio summary
  getPortfolioSummary() {
    const holdings = this.getCurrentHoldings();
    const holdingValues = Object.values(holdings);
    
    const totalValue = holdingValues.reduce((sum, h) => sum + h.currentValue, 0);
    const totalCost = holdingValues.reduce((sum, h) => sum + h.totalCost, 0);
    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    
    // Calculate day change
    let dayChange = 0;
    holdingValues.forEach(holding => {
      const priceData = this.currentPrices[holding.symbol];
      if (priceData) {
        const dailyChange = priceData.currentPrice - priceData.previousClose;
        dayChange += dailyChange * holding.shares;
      }
    });
    
    const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;
    
    // Calculate total dividend income
    const dividendIncome = this.dividends.reduce((sum, div) => sum + div.amount, 0);
    
    return {
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalGain: Math.round(totalGain * 100) / 100,
      totalGainPercent: Math.round(totalGainPercent * 100) / 100,
      dayChange: Math.round(dayChange * 100) / 100,
      dayChangePercent: Math.round(dayChangePercent * 100) / 100,
      dividendIncome: Math.round(dividendIncome * 100) / 100
    };
  }
  
  // Calculate sector allocation
  getSectorAllocation() {
    const holdings = this.getCurrentHoldings();
    const sectorTotals = {};
    let totalValue = 0;
    
    Object.values(holdings).forEach(holding => {
      const stock = this.currentPrices[holding.symbol];
      if (stock) {
        const sector = stock.sector;
        sectorTotals[sector] = (sectorTotals[sector] || 0) + holding.currentValue;
        totalValue += holding.currentValue;
      }
    });
    
    return Object.entries(sectorTotals).map(([sector, value]) => ({
      sector,
      value: Math.round(value * 100) / 100,
      percentage: Math.round((value / totalValue) * 10000) / 100
    }));
  }
  
  // Generate historical portfolio value (simplified simulation)
  getHistoricalData(days = 365) {
    const historical = [];
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    
    // Simulate historical values based on current holdings and price movements
    const currentSummary = this.getPortfolioSummary();
    const currentValue = currentSummary.totalValue;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Simple simulation: add some realistic volatility
      const daysFromEnd = days - i;
      const baseGrowth = Math.pow(1.08, daysFromEnd / 365); // 8% annual growth
      const volatility = 0.02 * (Math.random() - 0.5); // ±1% daily volatility
      const multiplier = baseGrowth * (1 + volatility);
      
      const historicalValue = currentValue / multiplier;
      const dayChange = i > 0 ? historicalValue - historical[i - 1].value : 0;
      const dayChangePercent = i > 0 && historical[i - 1].value > 0 
        ? (dayChange / historical[i - 1].value) * 100 
        : 0;
      
      historical.push({
        date: new Date(date),
        value: Math.round(historicalValue * 100) / 100,
        dayChange: Math.round(dayChange * 100) / 100,
        dayChangePercent: Math.round(dayChangePercent * 100) / 100
      });
    }
    
    return historical;
  }
  
  // Calculate performance metrics
  getPerformanceMetrics() {
    const summary = this.getPortfolioSummary();
    const historical = this.getHistoricalData();
    
    // Calculate annualized return
    const totalReturnPercent = summary.totalGainPercent;
    const yearsInvested = this.getInvestmentPeriodYears();
    const annualizedReturn = yearsInvested > 0 
      ? (Math.pow(1 + totalReturnPercent / 100, 1 / yearsInvested) - 1) * 100 
      : 0;
    
    // Calculate volatility (standard deviation of daily returns)
    const dailyReturns = historical.slice(1).map(point => point.dayChangePercent / 100);
    const avgReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length;
    const volatility = Math.sqrt(variance * 252) * 100; // Annualized volatility
    
    // Calculate Sharpe ratio (assuming 2% risk-free rate)
    const riskFreeRate = 2;
    const sharpeRatio = volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = historical[0].value;
    historical.forEach(point => {
      if (point.value > peak) {
        peak = point.value;
      }
      const drawdown = (peak - point.value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });
    
    // Calculate dividend yield
    const dividendYield = summary.totalValue > 0 
      ? (summary.dividendIncome / summary.totalValue) * 100 
      : 0;
    
    return {
      totalReturn: summary.totalGain,
      totalReturnPercent: Math.round(totalReturnPercent * 100) / 100,
      annualizedReturn: Math.round(annualizedReturn * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
      dividendYield: Math.round(dividendYield * 100) / 100
    };
  }
  
  // Helper method to calculate investment period in years
  getInvestmentPeriodYears() {
    if (this.transactions.length === 0) return 0;
    
    const firstTransaction = this.transactions[0];
    const now = new Date();
    const diffTime = Math.abs(now - firstTransaction.date);
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    
    return diffYears;
  }
}