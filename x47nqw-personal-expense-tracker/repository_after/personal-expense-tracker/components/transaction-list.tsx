"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: string;
  date: string;
  category: {
    name: string;
    icon: string;
    color: string;
  };
}

type DateRange = "all" | "week" | "month" | "custom";

export function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchTransactions();
    window.addEventListener("transactionAdded", () => {
      setCurrentPage(1);
      fetchTransactions();
    });
    return () =>
      window.removeEventListener("transactionAdded", fetchTransactions);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, filterType, searchTerm, dateRange, startDate, endDate]);

  const getDateRangeParams = () => {
    const now = new Date();
    const params: Record<string, string> = {};

    if (dateRange === "week") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      params.startDate = weekStart.toISOString().split("T")[0];
      params.endDate = now.toISOString().split("T")[0];
    } else if (dateRange === "month") {
      params.startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      params.endDate = now.toISOString().split("T")[0];
    } else if (dateRange === "custom") {
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
    }

    return params;
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * pageSize;
      const dateParams = getDateRangeParams();
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString(),
        ...(filterType !== "all" && { type: filterType }),
        ...(searchTerm && { search: searchTerm }),
        ...dateParams,
      });
      const response = await fetch(`/api/transactions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || data);
        setTotalCount(data.total || data.length);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchTransactions();
        // Dispatch event so other components (analytics, charts) can update
        window.dispatchEvent(new Event("transactionDeleted"));
      }
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const filterTotal = transactions.reduce((sum, t) => {
    return t.type === "income" ? sum + t.amount : sum - t.amount;
  }, 0);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Card className="bg-card border border-border/50 p-6">
      <div className="flex flex-col gap-4 mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Recent Transactions
        </h3>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1"
            />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as "all" | "income" | "expense");
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
            >
              <option value="all">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expenses Only</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as DateRange);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
            >
              <option value="all">All Dates</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateRange === "custom" && (
              <>
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1"
                />
                <Input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading transactions...
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No transactions found. Add your first transaction!
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-background/50 rounded-lg hover:bg-background transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: transaction.category.color + "20" }}
                  >
                    {transaction.category.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.category.name} • {formatDate(transaction.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p
                    className={`font-semibold ${transaction.type === "income"
                        ? "text-primary"
                        : "text-destructive"
                      }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(transaction.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-border space-y-4">
            {transactions.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-primary/5 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Income</p>
                  <p className="text-lg font-semibold text-primary">
                    {formatCurrency(totalIncome)}
                  </p>
                </div>
                <div className="bg-destructive/5 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                  <p className="text-lg font-semibold text-destructive">
                    {formatCurrency(totalExpenses)}
                  </p>
                </div>
                <div className="bg-card border border-border/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p
                    className={`text-lg font-semibold ${filterTotal >= 0 ? "text-primary" : "text-destructive"
                      }`}
                  >
                    {formatCurrency(filterTotal)}
                  </p>
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
