import React from 'react';

const TransactionHistory = ({ transactions, dividends }) => {
  if (!transactions && !dividends) {
    return (
      <div className="transaction-history">
        <p>Loading transaction history...</p>
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

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  // Combine and sort transactions and dividends
  const allEvents = [
    ...(transactions || []).map(t => ({
      ...t,
      eventType: 'transaction',
      amount: t.shares * t.price
    })),
    ...(dividends || []).map(d => ({
      ...d,
      eventType: 'dividend',
      type: 'DIVIDEND'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const getTypeColor = (type) => {
    switch (type) {
      case 'BUY': return '#10b981';
      case 'SELL': return '#ef4444';
      case 'DIVIDEND': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'BUY': return '↗';
      case 'SELL': return '↘';
      case 'DIVIDEND': return '💰';
      default: return '•';
    }
  };

  return (
    <div className="transaction-history">
      <div className="transaction-list">
        {allEvents.length === 0 ? (
          <div className="no-transactions">
            <p>No recent transactions</p>
          </div>
        ) : (
          allEvents.map((event, index) => (
            <div key={`${event.eventType}-${event.id || index}`} className="transaction-item">
              <div className="transaction-icon" style={{ color: getTypeColor(event.type) }}>
                {getTypeIcon(event.type)}
              </div>
              
              <div className="transaction-details">
                <div className="transaction-main">
                  <span className="transaction-type" style={{ color: getTypeColor(event.type) }}>
                    {event.type}
                  </span>
                  <span className="transaction-symbol">{event.symbol}</span>
                </div>
                
                <div className="transaction-info">
                  {event.eventType === 'transaction' ? (
                    <>
                      <span className="shares">{event.shares.toLocaleString()} shares</span>
                      <span className="price">@ {formatCurrency(event.price)}</span>
                    </>
                  ) : (
                    <span className="dividend-info">Dividend payment</span>
                  )}
                </div>
              </div>
              
              <div className="transaction-amount">
                <div className="amount" style={{ color: getTypeColor(event.type) }}>
                  {event.type === 'SELL' || event.type === 'DIVIDEND' ? '+' : '-'}
                  {formatCurrency(Math.abs(event.amount))}
                </div>
                <div className="date">{formatDate(event.date)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .transaction-history {
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          max-height: 400px;
          overflow-y: auto;
        }

        .transaction-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .no-transactions {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }

        .transaction-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 3px solid #e5e7eb;
          transition: all 0.2s ease;
        }

        .transaction-item:hover {
          background: #f1f5f9;
          border-left-color: #667eea;
        }

        .transaction-icon {
          font-size: 1.25rem;
          font-weight: bold;
          margin-right: 12px;
          min-width: 24px;
          text-align: center;
        }

        .transaction-details {
          flex: 1;
          min-width: 0;
        }

        .transaction-main {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .transaction-type {
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .transaction-symbol {
          font-weight: 600;
          color: #333;
        }

        .transaction-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: #666;
        }

        .shares, .price, .dividend-info {
          white-space: nowrap;
        }

        .transaction-amount {
          text-align: right;
          min-width: 100px;
        }

        .amount {
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 2px;
        }

        .date {
          font-size: 0.75rem;
          color: #888;
        }

        /* Custom scrollbar */
        .transaction-history::-webkit-scrollbar {
          width: 6px;
        }

        .transaction-history::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .transaction-history::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .transaction-history::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        @media (max-width: 768px) {
          .transaction-item {
            padding: 10px;
          }
          
          .transaction-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }
          
          .transaction-amount {
            min-width: 80px;
          }
          
          .amount {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
};

export default TransactionHistory;