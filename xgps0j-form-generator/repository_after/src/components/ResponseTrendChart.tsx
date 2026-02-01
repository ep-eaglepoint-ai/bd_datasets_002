'use client';

import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { format, parseISO } from 'date-fns';

Chart.register(...registerables);

interface ResponseTrendChartProps {
  data: Record<string, number>;
}

export default function ResponseTrendChart({ data }: ResponseTrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Sort dates and prepare data
    const sortedEntries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
    const labels = sortedEntries.map(([date]) => format(parseISO(date), 'MMM dd'));
    const values = sortedEntries.map(([, count]) => count);

    const chartConfig: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Daily Responses',
          data: values,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3B82F6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (context) => {
                const date = sortedEntries[context[0].dataIndex][0];
                return format(parseISO(date), 'MMMM dd, yyyy');
              },
              label: (context) => {
                return `${context.parsed.y} response${context.parsed.y !== 1 ? 's' : ''}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxTicksLimit: 10
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              callback: (value) => Math.floor(Number(value)).toString()
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    };

    chartRef.current = new Chart(ctx, chartConfig);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]);

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="chart-container flex items-center justify-center">
        <p className="text-gray-500">No trend data available</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
    </div>
  );
}