'use client';

import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { SurveyAnalytics, Survey } from '@/types/survey';
import { format, parseISO, subDays } from 'date-fns';

Chart.register(...registerables);

interface ComprehensiveAnalyticsChartProps {
  survey: Survey;
  analytics: SurveyAnalytics;
  chartType: 'completion-funnel' | 'response-heatmap' | 'satisfaction-overview' | 'response-timeline';
}

export default function ComprehensiveAnalyticsChart({ 
  survey, 
  analytics, 
  chartType 
}: ComprehensiveAnalyticsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    let chartConfig: ChartConfiguration;

    switch (chartType) {
      case 'completion-funnel':
        chartConfig = createCompletionFunnelChart(analytics);
        break;
      case 'response-heatmap':
        chartConfig = createResponseHeatmapChart(analytics);
        break;
      case 'satisfaction-overview':
        chartConfig = createSatisfactionOverviewChart(survey, analytics);
        break;
      case 'response-timeline':
        chartConfig = createResponseTimelineChart(analytics);
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
  }, [survey, analytics, chartType]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
    </div>
  );
}

function createCompletionFunnelChart(analytics: SurveyAnalytics): ChartConfiguration {
  const data = [
    { label: 'Started', value: analytics.totalResponses, color: '#3B82F6' },
    { label: 'In Progress', value: analytics.totalResponses - analytics.completedResponses, color: '#F59E0B' },
    { label: 'Completed', value: analytics.completedResponses, color: '#10B981' },
  ];

  return {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        label: 'Responses',
        data: data.map(d => d.value),
        backgroundColor: data.map(d => d.color),
        borderColor: data.map(d => d.color),
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y' as const,
      plugins: {
        title: {
          display: true,
          text: 'Response Completion Funnel'
        },
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const xValue = context.parsed?.x ?? 0;
              const percentage = ((xValue / analytics.totalResponses) * 100).toFixed(1);
              return `${xValue} responses (${percentage}%)`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  };
}

function createResponseHeatmapChart(analytics: SurveyAnalytics): ChartConfiguration {
  // Create a 7x24 heatmap (days of week x hours of day)
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  
  // Generate sample heatmap data (in real implementation, this would come from response timestamps)
  const heatmapData = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Simulate response patterns (higher during business hours, weekdays)
      let intensity = Math.random() * 10;
      if (day >= 1 && day <= 5 && hour >= 9 && hour <= 17) {
        intensity *= 3; // Business hours boost
      }
      if (hour >= 22 || hour <= 6) {
        intensity *= 0.3; // Night time reduction
      }
      
      heatmapData.push({
        x: hour,
        y: day,
        v: Math.floor(intensity)
      });
    }
  }

  return {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Response Intensity',
        data: heatmapData,
        backgroundColor: (context: any) => {
          const value = context.parsed?.v ?? 0;
          const alpha = Math.min(value / 20, 1);
          return `rgba(59, 130, 246, ${alpha})`;
        },
        pointRadius: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Response Activity Heatmap'
        },
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            title: () => '',
            label: (context: any) => {
              const dayIndex = context.parsed?.y ?? 0;
              const hourIndex = context.parsed?.x ?? 0;
              const day = days[Math.floor(dayIndex)] || 'Unknown';
              const hour = hours[Math.floor(hourIndex)] || '0:00';
              const value = (context.raw as any)?.v ?? 0;
              return `${day} ${hour}: ${value} responses`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: 0,
          max: 23,
          ticks: {
            stepSize: 2,
            callback: (value) => `${value}:00`
          },
          title: {
            display: true,
            text: 'Hour of Day'
          }
        },
        y: {
          type: 'linear',
          min: 0,
          max: 6,
          ticks: {
            stepSize: 1,
            callback: (value) => days[Number(value)] || ''
          },
          title: {
            display: true,
            text: 'Day of Week'
          }
        }
      }
    }
  };
}

function createSatisfactionOverviewChart(survey: Survey, analytics: SurveyAnalytics): ChartConfiguration {
  // Find rating scale questions for satisfaction analysis
  const ratingQuestions = survey.questions.filter(q => q.type === 'rating_scale');
  const questionAnalytics = analytics.questionAnalytics.filter(qa => 
    ratingQuestions.some(q => q.id === qa.questionId)
  );

  if (questionAnalytics.length === 0) {
    // Fallback: show completion rate as satisfaction
    return {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Incomplete'],
        datasets: [{
          data: [analytics.completedResponses, analytics.totalResponses - analytics.completedResponses],
          backgroundColor: ['#10B981', '#EF4444'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Survey Completion Rate'
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    };
  }

  // Create radar chart for multiple satisfaction metrics
  const labels = questionAnalytics.map(qa => {
    const question = ratingQuestions.find(q => q.id === qa.questionId);
    const title = question?.title || 'Question';
    return title.length > 30 ? title.substring(0, 30) + '...' : title;
  });

  const averageScores = questionAnalytics.map(qa => qa.statistics?.mean || 0);

  return {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Average Rating',
        data: averageScores,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3B82F6',
        borderWidth: 2,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Satisfaction Overview'
        },
        legend: {
          display: false
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 5,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  };
}

function createResponseTimelineChart(analytics: SurveyAnalytics): ChartConfiguration {
  // Sort dates and prepare cumulative data
  const sortedEntries = Object.entries(analytics.responsesByDay).sort(([a], [b]) => a.localeCompare(b));
  
  let cumulative = 0;
  const cumulativeData = sortedEntries.map(([date, count]) => {
    cumulative += count;
    return { date, daily: count, cumulative };
  });

  const labels = cumulativeData.map(item => format(parseISO(item.date), 'MMM dd'));
  const dailyData = cumulativeData.map(item => item.daily);
  const cumulativeDataPoints = cumulativeData.map(item => item.cumulative);

  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Daily Responses',
          data: dailyData,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: '#3B82F6',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Cumulative Responses',
          data: cumulativeDataPoints,
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: '#10B981',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          yAxisID: 'y1',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Response Timeline'
        },
        legend: {
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          title: {
            display: true,
            text: 'Daily Responses'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          title: {
            display: true,
            text: 'Total Responses'
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  };
}