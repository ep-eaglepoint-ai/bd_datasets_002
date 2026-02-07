import React from 'react';
import { formatCurrency, formatPercent, getColorClass } from '../utils/formatters.js';

function PortfolioSummary({ summary }) {
  if (!summary) {
    return (
      <div className="portfolio-summary">
        <p>Loading portfolio summary...</p>
      </div>
    );
  }
  
  return (
    <div className="portfolio-summary">
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">
            {formatCurrency(summary.totalValue)}
          </div>
          <div className="metric-label">Total Value</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-value">
            {formatCurrency(summary.totalCost)}
          </div>
          <div className="metric-label">Total Cost</div>
        </div>
        
        <div className="metric-card">
          <div className={`metric-value ${getColorClass(summary.totalGain)}`}>
            {formatCurrency(summary.totalGain)}
          </div>
          <div className="metric-label">Total Gain/Loss</div>
        </div>
        
        <div className="metric-card">
          <div className={`metric-value ${getColorClass(summary.totalGainPercent)}`}>
            {formatPercent(summary.totalGainPercent)}
          </div>
          <div className="metric-label">Total Return</div>
        </div>
        
        <div className="metric-card">
          <div className={`metric-value ${getColorClass(summary.dayChange)}`}>
            {formatCurrency(summary.dayChange)}
          </div>
          <div className="metric-label">Day Change</div>
        </div>
        
        <div className="metric-card">
          <div className={`metric-value ${getColorClass(summary.dayChangePercent)}`}>
            {formatPercent(summary.dayChangePercent)}
          </div>
          <div className="metric-label">Day Change %</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-value positive">
            {formatCurrency(summary.dividendIncome)}
          </div>
          <div className="metric-label">Dividend Income</div>
        </div>
      </div>
      
      <style jsx>{`
        .portfolio-summary {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .metric-card {
          text-align: center;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 4px solid #667eea;
        }
        
        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 8px;
          color: #333;
        }
        
        .metric-label {
          font-size: 0.875rem;
          color: #666;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .positive {
          color: #10b981;
        }
        
        .negative {
          color: #ef4444;
        }
        
        .neutral {
          color: #6b7280;
        }
        
        @media (max-width: 768px) {
          .portfolio-summary {
            padding: 15px;
          }
          
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          
          .metric-card {
            padding: 12px;
          }
          
          .metric-value {
            font-size: 1.25rem;
          }
          
          .metric-label {
            font-size: 0.75rem;
          }
        }
        
        @media (max-width: 480px) {
          .portfolio-summary {
            padding: 10px;
          }
          
          .metrics-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          
          .metric-card {
            padding: 10px;
          }
          
          .metric-value {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default PortfolioSummary;