import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, describe, beforeEach, vi } from 'vitest'
import Home from '../repository_after/app/page'

// Mock crypto
Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: () => Math.random().toString(36).substring(7)
    }
});

// Mock localStorage for the test environment
const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
        getItem: (key: string) => (key in store ? store[key] : null),
        setItem: (key: string, value: string) => { store[key] = String(value) },
        removeItem: (key: string) => { delete store[key] },
        clear: () => { store = {} }
    }
})()

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
})

// Helper to fill form
async function addExpense(user: any, title: string, amount: string, category: string, date: string) {
    await user.clear(screen.getByTestId('title-input'))
    await user.type(screen.getByTestId('title-input'), title)

    await user.clear(screen.getByTestId('amount-input'))
    await user.type(screen.getByTestId('amount-input'), amount)

    await user.selectOptions(screen.getByTestId('category-select'), category)

    await user.clear(screen.getByTestId('date-input'))
    await user.type(screen.getByTestId('date-input'), date)

    await user.click(screen.getByTestId('submit-button'))
}

describe('Expense Tracker App', () => {
    beforeEach(() => {
        // Ensure tests start with a fresh storage and render
        localStorage.clear()
        render(<Home />)
    })

    test('Requirement 1 & 2: Add new expense and display it in list', async () => {
        const user = userEvent.setup()

        // Check empty state
        expect(screen.getByText(/No expenses found/i)).toBeInTheDocument()

        // Add
        await addExpense(user, 'Test Expense', '50.00', 'Food', '2023-10-01')

        // Check list
        expect(screen.queryByText(/No expenses found/i)).not.toBeInTheDocument()
        expect(screen.getByText('Test Expense')).toBeInTheDocument()
        // Use getAllByText because amount might appear in Total
        const amountElements = screen.getAllByText('$50.00')
        expect(amountElements.length).toBeGreaterThan(0)

        expect(screen.getAllByText('Food').length).toBeGreaterThan(0)
        expect(screen.getAllByText('2023-10-01').length).toBeGreaterThan(0)
    })

    test('Requirement 3: Edit an existing expense', async () => {
        const user = userEvent.setup()

        // Add
        await addExpense(user, 'Original', '100', 'Transport', '2023-10-01')

        // Click Edit
        await user.click(screen.getByTestId('edit-btn-Original'))

        // Check form populated
        expect(screen.getByTestId('title-input')).toHaveValue('Original')

        // Update
        await user.clear(screen.getByTestId('title-input'))
        await user.type(screen.getByTestId('title-input'), 'Updated')
        await user.click(screen.getByTestId('submit-button'))

        // Verify
        expect(screen.getByText('Updated')).toBeInTheDocument()
        expect(screen.queryByText('Original')).not.toBeInTheDocument()
    })

    test('Requirement 4: Delete an existing expense', async () => {
        const user = userEvent.setup()

        // Add
        await addExpense(user, 'To be deleted', '20', 'Other', '2023-10-01')
        expect(screen.getByText('To be deleted')).toBeInTheDocument()

        // Delete
        await user.click(screen.getByTestId('delete-btn-To be deleted'))

        // Verify
        expect(screen.queryByText('To be deleted')).not.toBeInTheDocument()
    })

    test('Requirement 5: Automatically calculate total', async () => {
        const user = userEvent.setup()

        // Add two items
        await addExpense(user, 'Item 1', '10', 'Other', '2023-10-01')
        await addExpense(user, 'Item 2', '20', 'Other', '2023-10-01')

        // Check total
        expect(screen.getByTestId('total-amount')).toHaveTextContent('$30.00')
    })

    test('Requirement 6: Filter expenses by category', async () => {
        const user = userEvent.setup()

        await addExpense(user, 'Burger', '10', 'Food', '2023-10-01')
        await addExpense(user, 'Taxi', '20', 'Transport', '2023-10-01')

        // Filter Food
        await user.selectOptions(screen.getByTestId('filter-category'), 'Food')
        expect(screen.getByText('Burger')).toBeInTheDocument()
        expect(screen.queryByText('Taxi')).not.toBeInTheDocument()

        // Filter Transport
        await user.selectOptions(screen.getByTestId('filter-category'), 'Transport')
        expect(screen.queryByText('Burger')).not.toBeInTheDocument()
        expect(screen.getByText('Taxi')).toBeInTheDocument()

        // Clear
        await user.click(screen.getByTestId('clear-filters'))
        expect(screen.getByText('Burger')).toBeInTheDocument()
        expect(screen.getByText('Taxi')).toBeInTheDocument()
    })

    test('Requirement 1 Section 2: Filter expenses by date', async () => {
        const user = userEvent.setup()

        await addExpense(user, 'Date 1 Item', '10', 'Other', '2023-10-01')
        await addExpense(user, 'Date 2 Item', '10', 'Other', '2023-10-02')

        // Filter Date 1
        await fireEvent.change(screen.getByTestId('filter-date'), { target: { value: '2023-10-01' } })

        expect(screen.getByText('Date 1 Item')).toBeInTheDocument()
        expect(screen.queryByText('Date 2 Item')).not.toBeInTheDocument()

        // Clear
        await user.click(screen.getByTestId('clear-filters'))
        expect(screen.getByText('Date 1 Item')).toBeInTheDocument()
        expect(screen.getByText('Date 2 Item')).toBeInTheDocument()
    })

    test('Requirement 7: Validate user input', async () => {
        const user = userEvent.setup()

        // Attempt submit empty
        await user.click(screen.getByTestId('submit-button'))

        // Expect Error
        expect(screen.getByText(/All fields are required/i)).toBeInTheDocument()

        // Attempt invalid amount
        await user.type(screen.getByTestId('title-input'), 'Test')
        await user.type(screen.getByTestId('amount-input'), '-5')
        await user.type(screen.getByTestId('date-input'), '2023-10-01')
        await user.click(screen.getByTestId('submit-button'))

        // Check for any error message
        expect(screen.getByText(/All fields are required|Amount must be a positive number/i)).toBeInTheDocument()
    })

    test('Requirement 8: Responsive layout classes exist', async () => {
        // This test asserts that responsive Tailwind classes are present
        // indicating the layout supports different breakpoints.
        const grid = document.querySelector('main .grid')
        expect(grid).toBeTruthy()
        // Check the main markup includes responsive Tailwind class strings.
        const mainHtml = document.querySelector('main')?.innerHTML || ''
        expect(mainHtml.includes('lg:grid-cols-3') || mainHtml.includes('lg:grid-cols-2')).toBe(true)

        // Form column should include lg:col-span-1 (or a similar responsive span)
        expect(mainHtml.includes('lg:col-span-1') || mainHtml.includes('lg:col-span-2')).toBe(true)
    })

    test('Persistence: localStorage read/write and hydration on mount', async () => {
        const user = userEvent.setup()

        // cleanup the default render from beforeEach so we can control mounts
        cleanup()

        // Ensure storage is clean
        localStorage.removeItem('expenses_v1')

        // First mount and add an expense
        const { unmount } = render(<Home />)
        await addExpense(user, 'Persisted', '15', 'Other', '2023-10-10')

        // Verify localStorage was written
        const raw = localStorage.getItem('expenses_v1')
        expect(raw).toBeTruthy()
        const parsed = JSON.parse(raw as string)
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed.some((e: any) => e.title === 'Persisted')).toBe(true)

        // Unmount (simulate page unload) and remount (simulate reload)
        unmount()
        const { getByText } = render(<Home />)

        // The item should be hydrated from localStorage
        expect(getByText('Persisted')).toBeInTheDocument()
    })
})
