import { CATEGORIES, ExpenseCategory } from "@/types"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface FilterBarProps {
    categoryFilter: ExpenseCategory | "All"
    dateFilter: string
    onCategoryChange: (category: ExpenseCategory | "All") => void
    onDateChange: (date: string) => void
    onClearFilters: () => void
}

export function FilterBar({
    categoryFilter,
    dateFilter,
    onCategoryChange,
    onDateChange,
    onClearFilters,
}: FilterBarProps) {
    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
            <div className="w-full md:w-1/3">
                <label htmlFor="category-filter" className="text-sm font-medium mb-2 block">Filter by Category</label>
                <Select
                    id="category-filter"
                    data-testid="filter-category"
                    value={categoryFilter}
                    onChange={(e) => onCategoryChange(e.target.value as ExpenseCategory | "All")}
                >
                    <option value="All">All Categories</option>
                    {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </Select>
            </div>
            <div className="w-full md:w-1/3">
                <label htmlFor="date-filter" className="text-sm font-medium mb-2 block">Filter by Date</label>
                <Input
                    id="date-filter"
                    data-testid="filter-date"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => onDateChange(e.target.value)}
                />
            </div>
            <div className="w-full md:w-auto">
                <Button variant="outline" onClick={onClearFilters} data-testid="clear-filters">
                    Clear Filters
                </Button>
            </div>
        </div>
    )
}
