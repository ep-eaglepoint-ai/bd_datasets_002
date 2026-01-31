"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTooltip,
  Legend
);

interface TrendData {
  date: string;
  income: number;
  expenses: number;
}

export function SpendingTrends() {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendData();

    // Listen for transaction changes to update data in realtime
    const handleTransactionChange = () => {
      fetchTrendData();
    };

    window.addEventListener("transactionAdded", handleTransactionChange);
    window.addEventListener("transactionDeleted", handleTransactionChange);

    return () => {
      window.removeEventListener("transactionAdded", handleTransactionChange);
      window.removeEventListener("transactionDeleted", handleTransactionChange);
    };
  }, []);

  const fetchTrendData = async () => {
    try {
      const response = await fetch("/api/transactions/trends");
      if (response.ok) {
        const data = await response.json();
        setTrendData(data);
      }
    } catch (error) {
      console.error("Failed to fetch trend data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const lineChartData = {
    labels: trendData.map((item) => item.date),
    datasets: [
      {
        label: "Income",
        data: trendData.map((item) => item.income),
        borderColor: "rgba(79, 70, 229, 1)",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgba(79, 70, 229, 1)",
      },
      {
        label: "Expenses",
        data: trendData.map((item) => item.expenses),
        borderColor: "rgba(239, 68, 68, 1)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgba(239, 68, 68, 1)",
      },
    ],
  };

  const lineChartOptions = {
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
            return context.dataset.label + ": " + formatCurrency(context.parsed.y);
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
    <Card className="bg-card border border-border/50 p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Spending Trends (Last 30 Days)
      </h3>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading chart...
        </div>
      ) : trendData.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No data available
        </div>
      ) : (
        <div className="h-80">
          <Line data={lineChartData} options={lineChartOptions} />
        </div>
      )}
    </Card>
  );
}
