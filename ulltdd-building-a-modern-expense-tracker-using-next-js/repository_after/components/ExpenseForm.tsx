import { useState, useEffect } from "react"
import { Expense, CATEGORIES, ExpenseCategory } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"

interface ExpenseFormProps {
    onAddExpense: (expense: Omit<Expense, "id">) => void
    onUpdateExpense: (expense: Expense) => void
    editingExpense: Expense | null
    onCancelEdit: () => void
}

export function ExpenseForm({
    onAddExpense,
    onUpdateExpense,
    editingExpense,
    onCancelEdit,
}: ExpenseFormProps) {
    const [title, setTitle] = useState("")
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState<ExpenseCategory | "">("Other") // Default to Other or empty? Prompts say "add... with...", ensuring validity.
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [error, setError] = useState("")

    useEffect(() => {
        if (editingExpense) {
            setTitle(editingExpense.title)
            setAmount(editingExpense.amount.toString())
            setCategory(editingExpense.category as ExpenseCategory)
            setDate(editingExpense.date)
        } else {
            resetForm()
        }
    }, [editingExpense])

    const resetForm = () => {
        setTitle("")
        setAmount("")
        setCategory("Other")
        setDate(format(new Date(), "yyyy-MM-dd"))
        setError("")
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!title.trim() || !amount || !category || !date) {
            setError("All fields are required.")
            return
        }

        const numericAmount = parseFloat(amount)
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError("Amount must be a positive number.")
            return
        }

        const expenseData = {
            title,
            amount: numericAmount,
            category: category as ExpenseCategory,
            date,
        }

        if (editingExpense) {
            onUpdateExpense({ ...expenseData, id: editingExpense.id })
        } else {
            onAddExpense(expenseData)
            resetForm() // Only reset if adding
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            data-testid="title-input"
                            placeholder="e.g. Grocery Shopping"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                data-testid="amount-input"
                                type="number"
                                placeholder="0.00"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                id="category"
                                data-testid="category-select"
                                value={category}
                                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            data-testid="date-input"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                    <div className="flex gap-2 justify-end">
                        {editingExpense && (
                            <Button type="button" variant="outline" onClick={onCancelEdit}>
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" data-testid="submit-button">
                            {editingExpense ? "Update Expense" : "Add Expense"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
