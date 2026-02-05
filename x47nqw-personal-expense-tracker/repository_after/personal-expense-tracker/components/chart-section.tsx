"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  ChartTooltip,
  Legend
);

interface ChartData {
  category: string;
  amount: number;
  color: string;
}

interface TrendData {
  date: string;
  amount: number;
}

export function ChartSection() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();

    // Listen for transaction changes to update charts in realtime
    window.addEventListener("transactionAdded", fetchChartData);
    window.addEventListener("transactionDeleted", fetchChartData);

    return () => {
      window.removeEventListener("transactionAdded", fetchChartData);
      window.removeEventListener("transactionDeleted", fetchChartData);
    };
  }, []);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const [chartResponse, trendResponse] = await Promise.all([
        fetch("/api/transactions/chart-data"),
        fetch("/api/transactions/trends"),
      ]);

      if (chartResponse.ok) {
        const data = await chartResponse.json();
        setChartData(data);
      }

      if (trendResponse.ok) {
        const data = await trendResponse.json();
        setTrendData(data);
      }
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = chartData.reduce((sum, item) => sum + item.amount, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const pieChartData = {
    labels: chartData.map((item) => item.category),
    datasets: [
      {
        data: chartData.map((item) => item.amount),
        backgroundColor: chartData.map((item) => item.color),
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 2,
      },
    ],
  };

  const barChartData = {
    labels: trendData.map((item) => item.date),
    datasets: [
      {
        label: "Daily Spending",
        data: trendData.map((item) => item.amount),
        backgroundColor: "rgba(79, 70, 229, 0.8)",
        borderColor: "rgba(79, 70, 229, 1)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return formatCurrency(context.parsed.y || context.parsed);
          },
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: "x" as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return formatCurrency(context.parsed.y);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return "$" + value;
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border border-border/50 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Spending by Category
        </h3>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading chart...
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No expense data available
          </div>
        ) : (
          <>
            <div className="h-64 mb-6">
              <Pie data={pieChartData} options={chartOptions} />
            </div>

            <div className="space-y-2">
              {chartData.map((item) => {
                const percentage =
                  totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
                return (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <p className="text-sm text-muted-foreground">
                        {item.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(item.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      <Card className="bg-card border border-border/50 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Daily Spending Trends
        </h3>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading chart...
          </div>
        ) : trendData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No trend data available
          </div>
        ) : (
          <div className="h-64">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        )}
      </Card>
    </div>
  );
}
