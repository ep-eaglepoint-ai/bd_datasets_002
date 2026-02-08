import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, PieChart } from "lucide-react"
import { Expense } from "@/types"

interface SummaryCardsProps {
    expenses: Expense[]
}

export function SummaryCards({ expenses }: SummaryCardsProps) {
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0)

    // Calculate current month total
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const monthlyTotal = expenses
        .filter(e => {
            const date = new Date(e.date)
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear
        })
        .reduce((sum, e) => sum + e.amount, 0)

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <DollarSign className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold" data-testid="total-amount">${totalAmount.toFixed(2)}</div>
                    <p className="text-xs text-slate-500">
                        For all time
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
                    <PieChart className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold" data-testid="monthly-amount">
                        ${monthlyTotal.toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500">
                        For this month
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
