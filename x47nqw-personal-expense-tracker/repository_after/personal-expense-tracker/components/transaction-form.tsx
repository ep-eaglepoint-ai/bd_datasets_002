"use client";

import React from "react"

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

export function TransactionForm() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "expense"
  );
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    categoryId: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        `/api/categories?type=${transactionType}`
      );
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, categoryId: data[0].id }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          description: formData.description,
          categoryId: formData.categoryId,
          type: transactionType,
          date: new Date(formData.date),
        }),
      });

      if (response.ok) {
        setFormData({
          amount: "",
          description: "",
          categoryId: "",
          date: new Date().toISOString().split("T")[0],
        });
        window.dispatchEvent(new Event("transactionAdded"));
      }
    } catch (error) {
      console.error("Failed to create transaction:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: "income" | "expense") => {
    setTransactionType(type);
    setFormData((prev) => ({ ...prev, categoryId: "" }));
  };

  return (
    <Card className="bg-card border border-border/50 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground mb-6">
        Add New Transaction
      </h3>

      <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
        <Button
          type="button"
          onClick={() => handleTypeChange("expense")}
          variant={transactionType === "expense" ? "default" : "ghost"}
          className="flex-1 rounded-md"
        >
          Expense
        </Button>
        <Button
          type="button"
          onClick={() => handleTypeChange("income")}
          variant={transactionType === "income" ? "default" : "ghost"}
          className="flex-1 rounded-md"
        >
          Income
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
                disabled={loading}
                className="pl-6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Date
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <Input
            type="text"
            placeholder="What did you spend on?"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Category
          </label>
          <select
            value={formData.categoryId}
            onChange={(e) =>
              setFormData({ ...formData, categoryId: e.target.value })
            }
            required
            disabled={loading}
            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Transaction"
          )}
        </Button>
      </form>
    </Card>
  );
}
