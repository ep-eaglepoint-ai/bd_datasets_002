"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { TrendingDown, TrendingUp, DollarSign } from "lucide-react";

interface Stats {
  income: number;
  expenses: number;
  balance: number;
}

export function StatsSummary() {
  const [stats, setStats] = useState<Stats>({
    income: 0,
    expenses: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    // Listen for transaction changes to update stats in realtime
    const handleTransactionChange = () => {
      fetchStats();
    };

    window.addEventListener("transactionAdded", handleTransactionChange);
    window.addEventListener("transactionDeleted", handleTransactionChange);

    return () => {
      window.removeEventListener("transactionAdded", handleTransactionChange);
      window.removeEventListener("transactionDeleted", handleTransactionChange);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/transactions/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-card border border-border/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Income</p>
            <p className="text-2xl font-bold text-primary">
              {loading ? "..." : formatCurrency(stats.income)}
            </p>
          </div>
          <div className="bg-primary/10 p-3 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="bg-card border border-border/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-destructive">
              {loading ? "..." : formatCurrency(stats.expenses)}
            </p>
          </div>
          <div className="bg-destructive/10 p-3 rounded-lg">
            <TrendingDown className="w-5 h-5 text-destructive" />
          </div>
        </div>
      </Card>

      <Card className="bg-card border border-border/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Balance</p>
            <p
              className={`text-2xl font-bold ${stats.balance >= 0 ? "text-primary" : "text-destructive"
                }`}
            >
              {loading ? "..." : formatCurrency(stats.balance)}
            </p>
          </div>
          <div className="bg-accent/10 p-3 rounded-lg">
            <DollarSign className="w-5 h-5 text-accent" />
          </div>
        </div>
      </Card>
    </div>
  );
}
