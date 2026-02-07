import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../utils/formatters.js';

function SectorAllocation({ sectors }) {
  
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.sector}</p>
          <p style={{ margin: '5px 0 0 0' }}>
            Value: {formatCurrency(data.value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p style={{ margin: '5px 0 0 0' }}>
            Allocation: {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };
  
  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
    if (percentage < 5) return null; // Don't show labels for small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };
  
  if (!sectors || sectors.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
        No sector data available
      </div>
    );
  }
  
  return (
    <div className="sector-allocation">
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sectors}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="percentage"
            >
              {sectors.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="sector-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sector</th>
              <th>Value</th>
              <th>Allocation</th>
            </tr>
          </thead>
          <tbody>
            {sectors
              .sort((a, b) => b.percentage - a.percentage)
              .map(sector => (
                <tr key={sector.sector}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div 
                        style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: sector.color,
                          borderRadius: '2px',
                          marginRight: '8px'
                        }}
                      ></div>
                      {sector.sector}
                    </div>
                  </td>
                  <td>{formatCurrency(sector.value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  <td>{sector.percentage.toFixed(1)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      
      <style jsx>{`
        .sector-allocation {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .chart-container {
          height: 300px;
          width: 100%;
          margin-bottom: 20px;
        }
        
        .sector-table {
          overflow-x: auto;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .data-table th,
        .data-table td {
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .data-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }
        
        .data-table td {
          font-size: 0.875rem;
        }
        
        .data-table tr:hover {
          background-color: #f9fafb;
        }
        
        @media (max-width: 768px) {
          .sector-allocation {
            padding: 15px;
          }
          
          .chart-container {
            height: 250px;
          }
          
          .data-table th,
          .data-table td {
            padding: 6px 8px;
            font-size: 0.75rem;
          }
        }
        
        @media (max-width: 480px) {
          .sector-allocation {
            padding: 10px;
          }
          
          .chart-container {
            height: 200px;
          }
          
          .data-table th,
          .data-table td {
            padding: 4px 6px;
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
}

export default SectorAllocation;