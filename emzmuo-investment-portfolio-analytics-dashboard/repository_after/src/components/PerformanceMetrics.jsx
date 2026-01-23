import React from 'react';

const PerformanceMetrics = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="performance-metrics">
        <p>Loading performance metrics...</p>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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

  return (
    <div className="performance-metrics">
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Return</div>
          <div className={`metric-value ${getColorClass(metrics.totalReturn)}`}>
            {formatCurrency(metrics.totalReturn)}
          </div>
          <div className={`metric-subtitle ${getColorClass(metrics.totalReturnPercent)}`}>
            {formatPercent(metrics.totalReturnPercent)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Annualized Return</div>
          <div className={`metric-value ${getColorClass(metrics.annualizedReturn)}`}>
            {formatPercent(metrics.annualizedReturn)}
          </div>
          <div className="metric-subtitle">
            Since inception
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Volatility</div>
          <div className="metric-value">
            {formatPercent(metrics.volatility)}
          </div>
          <div className="metric-subtitle">
            Annualized
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Sharpe Ratio</div>
          <div className={`metric-value ${getColorClass(metrics.sharpeRatio)}`}>
            {metrics.sharpeRatio.toFixed(2)}
          </div>
          <div className="metric-subtitle">
            Risk-adjusted return
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Max Drawdown</div>
          <div className="metric-value negative">
            -{formatPercent(Math.abs(metrics.maxDrawdown))}
          </div>
          <div className="metric-subtitle">
            Largest decline
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Dividend Yield</div>
          <div className={`metric-value ${getColorClass(metrics.dividendYield)}`}>
            {formatPercent(metrics.dividendYield)}
          </div>
          <div className="metric-subtitle">
            Annual income
          </div>
        </div>
      </div>

      <style jsx>{`
        .performance-metrics {
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .metric-card {
          padding: 16px;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 4px solid #667eea;
          text-align: center;
        }

        .metric-label {
          font-size: 0.85rem;
          color: #666;
          font-weight: 500;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 4px;
          color: #333;
        }

        .metric-value.positive {
          color: #10b981;
        }

        .metric-value.negative {
          color: #ef4444;
        }

        .metric-value.neutral {
          color: #6b7280;
        }

        .metric-subtitle {
          font-size: 0.75rem;
          color: #888;
          font-weight: 500;
        }

        .metric-subtitle.positive {
          color: #10b981;
        }

        .metric-subtitle.negative {
          color: #ef4444;
        }

        @media (max-width: 768px) {
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
        }
      `}</style>
    </div>
  );
};

export default PerformanceMetrics;