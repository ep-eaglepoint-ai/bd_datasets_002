"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  topCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
}

export function MonthlyAnalytics() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMonthlyData();

    // Listen for transaction changes to update data in realtime
    const handleTransactionChange = () => {
      fetchMonthlyData();
    };

    window.addEventListener("transactionAdded", handleTransactionChange);
    window.addEventListener("transactionDeleted", handleTransactionChange);

    return () => {
      window.removeEventListener("transactionAdded", handleTransactionChange);
      window.removeEventListener("transactionDeleted", handleTransactionChange);
    };
  }, [currentMonth]);

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const response = await fetch(
        `/api/transactions/monthly?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setMonthlyData(data);
      }
    } catch (error) {
      console.error("Failed to fetch monthly data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const monthYear = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="bg-card border border-border/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Monthly Overview</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={previousMonth}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-32 text-center text-sm font-medium text-foreground">
            {monthYear}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading data...
        </div>
      ) : monthlyData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-background/50 p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Income</p>
              <p className="text-lg font-semibold text-primary">
                {formatCurrency(monthlyData.income)}
              </p>
            </div>
            <div className="bg-background/50 p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Expenses</p>
              <p className="text-lg font-semibold text-destructive">
                {formatCurrency(monthlyData.expenses)}
              </p>
            </div>
            <div className="bg-background/50 p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <p
                className={`text-lg font-semibold ${monthlyData.balance >= 0 ? "text-primary" : "text-destructive"
                  }`}
              >
                {formatCurrency(monthlyData.balance)}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Top Spending Categories
            </h4>
            <div className="space-y-2">
              {monthlyData.topCategories.length > 0 ? (
                monthlyData.topCategories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{cat.name}</p>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-foreground ml-4">
                      {formatCurrency(cat.amount)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No spending data for this month
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No data available
        </div>
      )}
    </Card>
  );
}
