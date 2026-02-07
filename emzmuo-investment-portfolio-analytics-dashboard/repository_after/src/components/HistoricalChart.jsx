import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatChartDate } from '../utils/formatters.js';

function HistoricalChart({ data }) {
  
  // Prepare data for chart (sample every 7 days for performance)
  const chartData = data
    .filter((_, index) => index % 7 === 0 || index === data.length - 1)
    .map(point => ({
      date: point.date.toISOString(),
      value: point.value,
      formattedDate: formatChartDate(point.date)
    }));
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const date = new Date(label);
      
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>
            {date.toLocaleDateString('en-US', { 
              weekday: 'short',
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </p>
          <p style={{ margin: '5px 0 0 0', color: '#667eea' }}>
            Portfolio Value: {formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };
  
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
        No historical data available
      </div>
    );
  }
  
  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));
  const padding = (maxValue - minValue) * 0.1;
  
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="formattedDate"
            stroke="#666"
            fontSize={12}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            domain={[minValue - padding, maxValue + padding]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#667eea" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#667eea' }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <style jsx>{`
        .chart-container {
          height: 400px;
          width: 100%;
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 768px) {
          .chart-container {
            height: 300px;
            padding: 15px;
          }
        }
        
        @media (max-width: 480px) {
          .chart-container {
            height: 250px;
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
}

export default HistoricalChart;