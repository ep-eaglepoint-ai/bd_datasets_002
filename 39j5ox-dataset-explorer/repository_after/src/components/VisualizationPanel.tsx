'use client';

import { useState, useMemo } from 'react';
import { useDatasetStore } from '../store/dataset-store';
import { Button } from '../components/ui/Button';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type ChartType = 'bar' | 'line' | 'pie' | 'scatter';

export function VisualizationPanel() {
  const { currentDataset, filteredData } = useDatasetStore();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xColumn, setXColumn] = useState<string>('');
  const [yColumn, setYColumn] = useState<string>('');

  if (!currentDataset) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No dataset loaded</p>
      </div>
    );
  }

  const currentVersion = currentDataset.versions.find(v => v.id === currentDataset.currentVersion);
  if (!currentVersion || filteredData.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const columns = currentVersion.columns;
  const numericColumns = columns.filter(c => c.type === 'number');
  const categoricalColumns = columns.filter(c => c.type === 'string' || c.type === 'boolean');

  const chartData = useMemo(() => {
    if (!xColumn || (chartType !== 'pie' && !yColumn)) return null;

    if (chartType === 'pie') {
      // For pie charts, count occurrences of each category
      const counts: Record<string, number> = {};
      filteredData.forEach(row => {
        const value = String(row[xColumn] || 'Unknown');
        counts[value] = (counts[value] || 0) + 1;
      });

      return {
        labels: Object.keys(counts),
        datasets: [{
          data: Object.values(counts),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
          ],
        }]
      };
    }

    if (chartType === 'scatter') {
      return {
        datasets: [{
          label: `${yColumn} vs ${xColumn}`,
          data: filteredData.map(row => ({
            x: Number(row[xColumn]) || 0,
            y: Number(row[yColumn]) || 0,
          })),
          backgroundColor: '#36A2EB',
        }]
      };
    }

    // For bar and line charts, aggregate by x column
    const aggregated: Record<string, number[]> = {};
    filteredData.forEach(row => {
      const xValue = String(row[xColumn] || 'Unknown');
      const yValue = Number(row[yColumn]) || 0;
      
      if (!aggregated[xValue]) {
        aggregated[xValue] = [];
      }
      aggregated[xValue].push(yValue);
    });

    // Calculate averages
    const labels = Object.keys(aggregated);
    const data = labels.map(label => {
      const values = aggregated[label];
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    return {
      labels,
      datasets: [{
        label: yColumn,
        data,
        backgroundColor: chartType === 'bar' ? '#36A2EB' : undefined,
        borderColor: chartType === 'line' ? '#36A2EB' : undefined,
        fill: false,
      }]
    };
  }, [filteredData, chartType, xColumn, yColumn]);

  const renderChart = () => {
    if (!chartData) return null;

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
      },
    };

    switch (chartType) {
      case 'bar':
        return <Bar data={chartData} options={options} />;
      case 'line':
        return <Line data={chartData} options={options} />;
      case 'pie':
        return <Pie data={chartData} options={options} />;
      case 'scatter':
        return <Scatter data={chartData} options={options} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-medium">Visualizations</h3>

      {/* Chart Type Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Chart Type</label>
        <div className="grid grid-cols-2 gap-2">
          {(['bar', 'line', 'pie', 'scatter'] as ChartType[]).map(type => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3 py-2 text-sm rounded border ${
                chartType === type
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Column Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {chartType === 'pie' ? 'Category Column' : 'X-Axis'}
        </label>
        <select
          value={xColumn}
          onChange={(e) => setXColumn(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
        >
          <option value="">Select column...</option>
          {(chartType === 'pie' ? categoricalColumns : columns).map(col => (
            <option key={col.id} value={col.name}>
              {col.name} ({col.type})
            </option>
          ))}
        </select>
      </div>

      {chartType !== 'pie' && (
        <div>
          <label className="block text-sm font-medium mb-2">Y-Axis</label>
          <select
            value={yColumn}
            onChange={(e) => setYColumn(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
          >
            <option value="">Select column...</option>
            {numericColumns.map(col => (
              <option key={col.id} value={col.name}>
                {col.name} ({col.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Chart Display */}
      <div className="border border-gray-200 rounded p-4" style={{ height: '300px' }}>
        {chartData ? (
          renderChart()
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select columns to generate chart
          </div>
        )}
      </div>
    </div>
  );
}