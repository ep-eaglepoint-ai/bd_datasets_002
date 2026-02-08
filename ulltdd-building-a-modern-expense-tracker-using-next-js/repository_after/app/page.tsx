"use client"

import { useState, useMemo } from "react"
import { Expense, ExpenseCategory } from "@/types"
import { ExpenseForm } from "@/components/ExpenseForm"
import { ExpenseList } from "@/components/ExpenseList"
import { SummaryCards } from "@/components/SummaryCards"
import { FilterBar } from "@/components/FilterBar"

export default function Home() {
  // State for expenses
  // Validating Requirement: "The application shall allow users to... add, edit, delete"
  const [expenses, setExpenses] = useState<Expense[]>([])

  // State for editing
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // State for filters
  // Validating Requirement: "Filter expenses by category and date"
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "All">("All")
  const [dateFilter, setDateFilter] = useState("")

  // Handlers
  const addExpense = (newExpenseData: Omit<Expense, "id">) => {
    const newExpense: Expense = {
      ...newExpenseData,
      id: crypto.randomUUID(), // Validating Requirement: "add... title, amount, category, date"
    }
    setExpenses((prev) => [newExpense, ...prev])
  }

  const updateExpense = (updatedExpense: Expense) => {
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === updatedExpense.id ? updatedExpense : expense
      )
    )
    setEditingExpense(null)
  }

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id))
    if (editingExpense?.id === id) {
      setEditingExpense(null)
    }
  }

  const startEdit = (expense: Expense) => {
    setEditingExpense(expense)
    // Scroll to form could be nice, but not strictly required.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingExpense(null)
  }

  const clearFilters = () => {
    setCategoryFilter("All")
    setDateFilter("")
  }

  // Derived state for filtering
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesCategory =
        categoryFilter === "All" || expense.category === categoryFilter
      const matchesDate = !dateFilter || expense.date === dateFilter
      return matchesCategory && matchesDate
    })
  }, [expenses, categoryFilter, dateFilter])

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-slate-900">Expense Tracker</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Requirement 5: Automatically calculate and display... total */}
        {/* Passing filtered expenses so the summary reflects the current view */}
        <SummaryCards expenses={filteredExpenses} />

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6" data-testid="expense-form-panel">
            <ExpenseForm
              onAddExpense={addExpense}
              onUpdateExpense={updateExpense}
              editingExpense={editingExpense}
              onCancelEdit={cancelEdit}
            />
          </div>

          <div className="lg:col-span-2 space-y-6" data-testid="expense-list-panel">
            <FilterBar
              categoryFilter={categoryFilter}
              dateFilter={dateFilter}
              onCategoryChange={setCategoryFilter}
              onDateChange={setDateFilter}
              onClearFilters={clearFilters}
            />

            <ExpenseList
              expenses={filteredExpenses}
              onEdit={startEdit}
              onDelete={deleteExpense}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
