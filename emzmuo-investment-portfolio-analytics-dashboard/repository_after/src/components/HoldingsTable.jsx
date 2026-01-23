import React from 'react';

function HoldingsTable({ holdings, currentPrices }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };
  
  const formatPercent = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };
  
  const getColorClass = (value) => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };
  
  const holdingsArray = Object.values(holdings).sort((a, b) => b.currentValue - a.currentValue);
  
  if (holdingsArray.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
        No holdings found
      </div>
    );
  }
  
  return (
    <div className="holdings-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th className="hide-mobile">Company</th>
            <th>Shares</th>
            <th className="hide-mobile">Avg Cost</th>
            <th>Current Price</th>
            <th>Market Value</th>
            <th className="hide-mobile">Total Cost</th>
            <th>Gain/Loss</th>
            <th className="hide-mobile">Return %</th>
            <th className="hide-mobile">Day Change</th>
          </tr>
        </thead>
        <tbody>
          {holdingsArray.map(holding => {
            const priceData = currentPrices[holding.symbol];
            const dayChange = priceData ? 
              (priceData.currentPrice - priceData.previousClose) * holding.shares : 0;
            const dayChangePercent = priceData && priceData.previousClose > 0 ? 
              ((priceData.currentPrice - priceData.previousClose) / priceData.previousClose) * 100 : 0;
            
            return (
              <tr key={holding.symbol}>
                <td style={{ fontWeight: 'bold', color: '#667eea' }}>
                  {holding.symbol}
                </td>
                <td className="hide-mobile">{priceData?.name || 'Unknown'}</td>
                <td>{holding.shares.toLocaleString()}</td>
                <td className="hide-mobile">{formatCurrency(holding.averageCost)}</td>
                <td>{formatCurrency(priceData?.currentPrice || 0)}</td>
                <td style={{ fontWeight: 'bold' }}>
                  {formatCurrency(holding.currentValue)}
                </td>
                <td className="hide-mobile">{formatCurrency(holding.totalCost)}</td>
                <td className={getColorClass(holding.unrealizedGain)}>
                  {formatCurrency(holding.unrealizedGain)}
                </td>
                <td className={`hide-mobile ${getColorClass(holding.unrealizedGainPercent)}`}>
                  {formatPercent(holding.unrealizedGainPercent)}
                </td>
                <td className={`hide-mobile ${getColorClass(dayChange)}`}>
                  {formatCurrency(dayChange)}
                  <br />
                  <small className={getColorClass(dayChangePercent)}>
                    ({formatPercent(dayChangePercent)})
                  </small>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <style jsx>{`
        .holdings-table-container {
          overflow-x: auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }
        
        .data-table th,
        .data-table td {
          padding: 12px 8px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .data-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .data-table td {
          font-size: 0.875rem;
        }
        
        .data-table tr:hover {
          background-color: #f9fafb;
        }
        
        .positive {
          color: #10b981;
          font-weight: 600;
        }
        
        .negative {
          color: #ef4444;
          font-weight: 600;
        }
        
        .neutral {
          color: #6b7280;
        }
        
        @media (max-width: 768px) {
          .hide-mobile {
            display: none;
          }
          
          .data-table {
            min-width: 400px;
          }
          
          .data-table th,
          .data-table td {
            padding: 8px 4px;
            font-size: 0.75rem;
          }
        }
        
        @media (max-width: 480px) {
          .data-table th,
          .data-table td {
            padding: 6px 2px;
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
}

export default HoldingsTable;