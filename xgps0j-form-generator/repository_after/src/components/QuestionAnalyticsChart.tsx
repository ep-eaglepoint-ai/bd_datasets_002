'use client';

import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Question, QuestionAnalytics } from '@/types/survey';

Chart.register(...registerables);

interface QuestionAnalyticsChartProps {
  question: Question;
  analytics: QuestionAnalytics;
}

export default function QuestionAnalyticsChart({ question, analytics }: QuestionAnalyticsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !analytics.distribution) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = Object.keys(analytics.distribution);
    const data = Object.values(analytics.distribution);

    let chartConfig: ChartConfiguration;

    switch (question.type) {
      case 'single_choice':
      case 'multiple_choice':
        chartConfig = {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{
              data,
              backgroundColor: [
                '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
              ],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  usePointStyle: true,
                  padding: 20
                }
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const total = data.reduce((sum, value) => sum + value, 0);
                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                    return `${context.label}: ${context.parsed} (${percentage}%)`;
                  }
                }
              }
            }
          }
        };
        break;

      case 'rating_scale':
      case 'numeric_input':
        chartConfig = {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Responses',
              data,
              backgroundColor: '#3B82F6',
              borderColor: '#2563EB',
              borderWidth: 1
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
                callbacks: {
                  label: (context) => {
                    const total = data.reduce((sum, value) => sum + value, 0);
                    const yValue = context.parsed?.y ?? 0;
                    const percentage = ((yValue / total) * 100).toFixed(1);
                    return `${yValue} responses (${percentage}%)`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1
                }
              }
            }
          }
        };
        break;

      case 'boolean':
        const booleanLabels = labels.map(label => {
          if (question.type === 'boolean') {
            return label === 'true' ? question.trueLabel || 'Yes' : question.falseLabel || 'No';
          }
          return label;
        });
        
        chartConfig = {
          type: 'doughnut',
          data: {
            labels: booleanLabels,
            datasets: [{
              data,
              backgroundColor: ['#10B981', '#EF4444'],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  usePointStyle: true,
                  padding: 20
                }
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const total = data.reduce((sum, value) => sum + value, 0);
                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                    return `${context.label}: ${context.parsed} (${percentage}%)`;
                  }
                }
              }
            }
          }
        };
        break;

      case 'short_text':
      case 'long_text':
        chartConfig = {
          type: 'bar',
          data: {
            labels: labels.map(label => `${label} chars`),
            datasets: [{
              label: 'Responses',
              data,
              backgroundColor: '#8B5CF6',
              borderColor: '#7C3AED',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              title: {
                display: true,
                text: 'Response Length Distribution'
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const total = data.reduce((sum, value) => sum + value, 0);
                    const yValue = context.parsed?.y ?? 0;
                    const percentage = ((yValue / total) * 100).toFixed(1);
                    return `${yValue} responses (${percentage}%)`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1
                }
              }
            }
          }
        };
        break;

      default:
        return;
    }

    chartRef.current = new Chart(ctx, chartConfig);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [question, analytics]);

  if (!analytics.distribution || Object.keys(analytics.distribution).length === 0) {
    return (
      <div className="chart-container flex items-center justify-center">
        <p className="text-gray-500">No response data available</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
    </div>
  );
}