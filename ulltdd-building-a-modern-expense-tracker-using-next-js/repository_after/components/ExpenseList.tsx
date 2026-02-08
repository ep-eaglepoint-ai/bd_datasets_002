import { Expense } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit2, Trash2 } from "lucide-react"

interface ExpenseListProps {
    expenses: Expense[]
    onEdit: (expense: Expense) => void
    onDelete: (id: string) => void
}

export function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
    if (expenses.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <p>No expenses found.</p>
                    <p className="text-sm">Add some expenses to get started!</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Title</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map((expense) => (
                                <tr key={expense.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                                        {expense.date}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {expense.title}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                        ${expense.amount.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEdit(expense)}
                                                aria-label="Edit expense"
                                                data-testid={`edit-btn-${expense.title}`}
                                            >
                                                <Edit2 className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDelete(expense.id)}
                                                className="hover:bg-red-50"
                                                aria-label="Delete expense"
                                                data-testid={`delete-btn-${expense.title}`}
                                            >
                                                <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
