/**
 * Personal Expense Tracker - Test Suite
 * 
 * This file contains tests to verify all required functionality is implemented correctly.
 * Tests cover all 6 criteria for the expense tracker application.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Test user credentials
const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
};

let authCookie: string = '';
let testTransactionId: string = '';
let categoryId: string = '';

// Helper function to make authenticated requests
async function authFetch(url: string, options: RequestInit = {}) {
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            'Cookie': authCookie,
        },
    });
}

describe('Criteria 1: User Authentication (NextAuth.js with Email/Password)', () => {

    describe('User Signup', () => {
        it('should create a new user with valid credentials', async () => {
            const response = await fetch(`${BASE_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testUser),
            });

            expect(response.status).toBe(201);
            const data = await response.json();
            expect(data.message).toBe('User created successfully');
            expect(data.user.email).toBe(testUser.email);
        });

        it('should reject duplicate email registration', async () => {
            const response = await fetch(`${BASE_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testUser),
            });

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('User already exists');
        });

        it('should require email and password', async () => {
            const response = await fetch(`${BASE_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: '' }),
            });

            expect(response.status).toBe(400);
        });
    });

    describe('User Login (JWT Strategy)', () => {
        it('should authenticate with valid credentials via NextAuth callback', async () => {
            // 1. Get CSRF token AND the CSRF cookie
            const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
            const csrfData = await csrfResponse.json();
            const csrfCookie = csrfResponse.headers.get('set-cookie') || '';

            // 2. Perform login with the CSRF cookie
            const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': csrfCookie
                },
                body: new URLSearchParams({
                    email: testUser.email,
                    password: testUser.password,
                    csrfToken: csrfData.csrfToken,
                }),
                redirect: 'manual',
            });

            // NextAuth redirects on successful login
            expect([200, 302]).toContain(response.status);

            // 3. Store cookies for authenticated requests
            const setCookie = response.headers.get('set-cookie');
            if (setCookie) {
                // Properly join multiple cookies for the Cookie header
                // We also include the initial CSRF cookie just in case, though session token is most important
                const loginCookies = setCookie.split(/,(?=[^;]+?=)/).map(c => c.trim().split(';')[0]);
                const initialCookies = csrfCookie.split(/,(?=[^;]+?=)/).map(c => c.trim().split(';')[0]);

                authCookie = [...new Set([...initialCookies, ...loginCookies])].join('; ');
                // console.log('Final Auth Cookie:', authCookie);
            }

            expect(authCookie).toContain('session-token');
        });

        it('should reject invalid credentials', async () => {
            const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
            const csrfData = await csrfResponse.json();

            const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    email: testUser.email,
                    password: 'wrongpassword',
                    csrfToken: csrfData.csrfToken,
                }),
                redirect: 'manual',
            });

            // Should redirect to login with error
            expect(response.status).toBe(302);
        });
    });

    describe('Protected Routes', () => {
        it('should redirect unauthenticated users from dashboard', async () => {
            const response = await fetch(`${BASE_URL}/dashboard`, {
                redirect: 'manual',
            });

            // Should redirect to login
            expect([302, 307, 308]).toContain(response.status);
        });

        it('should return 401 for unauthenticated API requests', async () => {
            const response = await fetch(`${BASE_URL}/api/transactions`);

            expect(response.status).toBe(401);
        });
    });
});

describe('Criteria 2: Transaction Management (CRUD Operations)', () => {

    beforeAll(async () => {
        // Get categories first
        const catResponse = await authFetch(`${BASE_URL}/api/categories`);
        if (catResponse.ok) {
            const categories = await catResponse.json();
            if (categories.length > 0) {
                categoryId = categories.find((c: any) => c.type === 'expense')?.id || categories[0].id;
            }
        }
    });

    describe('Add Transaction', () => {
        it('should create a new transaction with all required fields', async () => {
            const transaction = {
                amount: 50.00,
                description: 'Test grocery shopping',
                date: new Date().toISOString(),
                type: 'expense',
                categoryId: categoryId,
            };

            const response = await authFetch(`${BASE_URL}/api/transactions`, {
                method: 'POST',
                body: JSON.stringify(transaction),
            });

            expect(response.status).toBe(201);
            const data = await response.json();
            expect(data.amount).toBe(50.00);
            expect(data.description).toBe('Test grocery shopping');
            expect(data.type).toBe('expense');
            testTransactionId = data.id;
        });

        it('should validate required fields', async () => {
            const response = await authFetch(`${BASE_URL}/api/transactions`, {
                method: 'POST',
                body: JSON.stringify({ amount: 100 }), // Missing required fields
            });

            expect(response.status).toBe(400);
        });

        it('should create income transaction', async () => {
            const incomeCategories = await authFetch(`${BASE_URL}/api/categories`);
            const cats = await incomeCategories.json();
            const incomeCategory = cats.find((c: any) => c.type === 'income');

            const transaction = {
                amount: 3000.00,
                description: 'Monthly salary',
                date: new Date().toISOString(),
                type: 'income',
                categoryId: incomeCategory?.id || categoryId,
            };

            const response = await authFetch(`${BASE_URL}/api/transactions`, {
                method: 'POST',
                body: JSON.stringify(transaction),
            });

            expect(response.status).toBe(201);
            const data = await response.json();
            expect(data.type).toBe('income');
        });
    });

    describe('Delete Transaction', () => {
        it('should delete an existing transaction', async () => {
            // First create a transaction to delete
            const transaction = {
                amount: 25.00,
                description: 'To be deleted',
                date: new Date().toISOString(),
                type: 'expense',
                categoryId: categoryId,
            };

            const createResponse = await authFetch(`${BASE_URL}/api/transactions`, {
                method: 'POST',
                body: JSON.stringify(transaction),
            });
            const created = await createResponse.json();

            const response = await authFetch(`${BASE_URL}/api/transactions/${created.id}`, {
                method: 'DELETE',
            });

            expect(response.status).toBe(200);
        });
    });
});

describe('Criteria 3: Predefined Categories', () => {

    describe('Category Structure', () => {
        it('should have predefined expense categories', async () => {
            const response = await authFetch(`${BASE_URL}/api/categories`);

            expect(response.status).toBe(200);
            const categories = await response.json();

            const expenseCategories = categories.filter((c: any) => c.type === 'expense');
            expect(expenseCategories.length).toBeGreaterThan(0);

            // Check for common expense categories
            const categoryNames = expenseCategories.map((c: any) => c.name.toLowerCase());
            const expectedCategories = ['food', 'transport', 'entertainment', 'bills', 'shopping'];
            const hasExpectedCategories = expectedCategories.some(expected =>
                categoryNames.some((name: string) => name.includes(expected))
            );
            expect(hasExpectedCategories).toBe(true);
        });

        it('should have predefined income categories', async () => {
            const response = await authFetch(`${BASE_URL}/api/categories`);
            const categories = await response.json();

            const incomeCategories = categories.filter((c: any) => c.type === 'income');
            expect(incomeCategories.length).toBeGreaterThan(0);

            // Check for common income categories
            const categoryNames = incomeCategories.map((c: any) => c.name.toLowerCase());
            const expectedCategories = ['salary', 'freelance', 'investment'];
            const hasExpectedCategories = expectedCategories.some(expected =>
                categoryNames.some((name: string) => name.includes(expected))
            );
            expect(hasExpectedCategories).toBe(true);
        });

        it('should have distinct colors for categories', async () => {
            const response = await authFetch(`${BASE_URL}/api/categories`);
            const categories = await response.json();

            // Each category should have a color property
            categories.forEach((category: any) => {
                expect(category.color).toBeDefined();
                expect(category.color).toMatch(/^#[0-9a-fA-F]{6}$/);
            });
        });
    });
});

describe('Criteria 4: Transaction List with Pagination and Filters', () => {

    describe('Paginated List', () => {
        it('should return paginated transactions sorted by date', async () => {
            const response = await authFetch(`${BASE_URL}/api/transactions?limit=10&offset=0`);

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.transactions).toBeDefined();
            expect(Array.isArray(data.transactions)).toBe(true);
            expect(data.total).toBeDefined();

            // Verify sorted by date (descending)
            if (data.transactions.length > 1) {
                for (let i = 0; i < data.transactions.length - 1; i++) {
                    const currentDate = new Date(data.transactions[i].date);
                    const nextDate = new Date(data.transactions[i + 1].date);
                    expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
                }
            }
        });

        it('should support pagination with limit and offset', async () => {
            const page1 = await authFetch(`${BASE_URL}/api/transactions?limit=5&offset=0`);
            const page2 = await authFetch(`${BASE_URL}/api/transactions?limit=5&offset=5`);

            expect(page1.status).toBe(200);
            expect(page2.status).toBe(200);
        });
    });

    describe('Filters', () => {
        it('should filter by transaction type', async () => {
            const response = await authFetch(`${BASE_URL}/api/transactions?type=expense`);

            expect(response.status).toBe(200);
            const data = await response.json();
            data.transactions.forEach((t: any) => {
                expect(t.type).toBe('expense');
            });
        });

        it('should filter by date range', async () => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            const endDate = new Date();

            const response = await authFetch(
                `${BASE_URL}/api/transactions?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
            );

            expect(response.status).toBe(200);
        });

        it('should filter by search term', async () => {
            const response = await authFetch(`${BASE_URL}/api/transactions?search=grocery`);

            expect(response.status).toBe(200);
        });
    });

    describe('Running Totals', () => {
        it('should return total count for filtered results', async () => {
            const response = await authFetch(`${BASE_URL}/api/transactions`);
            const data = await response.json();

            expect(data.total).toBeDefined();
            expect(typeof data.total).toBe('number');
        });
    });
});

describe('Criteria 5: Dashboard with Charts', () => {

    describe('Summary Statistics', () => {
        it('should return total income, expenses, and balance', async () => {
            const response = await authFetch(`${BASE_URL}/api/transactions/stats`);

            expect(response.status).toBe(200);
            const data = await response.json();

            expect(data.income).toBeDefined();
            expect(data.expenses).toBeDefined();
            expect(data.balance).toBeDefined();
            expect(typeof data.income).toBe('number');
            expect(typeof data.expenses).toBe('number');
            expect(typeof data.balance).toBe('number');
            expect(data.balance).toBe(data.income - data.expenses);
        });
    });

    describe('Pie Chart Data (Expenses by Category)', () => {
        it('should return expense breakdown by category', async () => {
            const response = await authFetch(`${BASE_URL}/api/transactions/chart-data`);

            expect(response.status).toBe(200);
            const data = await response.json();

            expect(Array.isArray(data)).toBe(true);
            data.forEach((item: any) => {
                expect(item.category).toBeDefined();
                expect(item.amount).toBeDefined();
                expect(item.color).toBeDefined();
            });
        });
    });

    describe('Bar Chart Data (Spending Trends)', () => {
        it('should return daily/monthly spending trends', async () => {
            const response = await authFetch(`${BASE_URL}/api/transactions/trends`);

            expect(response.status).toBe(200);
            const data = await response.json();

            expect(Array.isArray(data)).toBe(true);
            data.forEach((item: any) => {
                expect(item.date).toBeDefined();
                // Should have income and/or expenses
                expect(item.income !== undefined || item.expenses !== undefined || item.amount !== undefined).toBe(true);
            });
        });
    });
});

describe('Criteria 6: Monthly Analytics View', () => {

    describe('Monthly Overview', () => {
        it('should return income vs expenses comparison for a month', async () => {
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const response = await authFetch(
                `${BASE_URL}/api/transactions/monthly?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
            );

            expect(response.status).toBe(200);
            const data = await response.json();

            expect(data.income).toBeDefined();
            expect(data.expenses).toBeDefined();
            expect(data.balance).toBeDefined();
        });

        it('should return top spending categories', async () => {
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const response = await authFetch(
                `${BASE_URL}/api/transactions/monthly?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
            );

            expect(response.status).toBe(200);
            const data = await response.json();

            expect(data.topCategories).toBeDefined();
            expect(Array.isArray(data.topCategories)).toBe(true);

            data.topCategories.forEach((cat: any) => {
                expect(cat.name).toBeDefined();
                expect(cat.amount).toBeDefined();
                expect(cat.percentage).toBeDefined();
            });
        });

        it('should include category percentages', async () => {
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const response = await authFetch(
                `${BASE_URL}/api/transactions/monthly?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
            );

            const data = await response.json();

            if (data.topCategories && data.topCategories.length > 0) {
                // Sum of percentages should be <= 100
                const totalPercentage = data.topCategories.reduce((sum: number, cat: any) => sum + cat.percentage, 0);
                expect(totalPercentage).toBeLessThanOrEqual(100.1); // Allow small floating point error
            }
        });
    });

    describe('Date Range Navigation', () => {
        it('should support querying different months', async () => {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
            const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

            const response = await authFetch(
                `${BASE_URL}/api/transactions/monthly?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
            );

            expect(response.status).toBe(200);
        });
    });
});

// Additional integration tests
describe('Integration Tests', () => {

    it('maintain data consistency across operations', async () => {
        // Get initial stats
        const initialStats = await authFetch(`${BASE_URL}/api/transactions/stats`);
        const initialData = await initialStats.json();

        // Add an expense
        const expense = {
            amount: 100.00,
            description: 'Test expense for consistency',
            date: new Date().toISOString(),
            type: 'expense',
            categoryId: categoryId,
        };

        await authFetch(`${BASE_URL}/api/transactions`, {
            method: 'POST',
            body: JSON.stringify(expense),
        });

        // Check stats updated
        const updatedStats = await authFetch(`${BASE_URL}/api/transactions/stats`);
        const updatedData = await updatedStats.json();

        expect(updatedData.expenses).toBeGreaterThanOrEqual(initialData.expenses);
    });

    it('should isolate user data (transactions belong to logged-in user)', async () => {
        // Create a transaction
        const transaction = {
            amount: 75.00,
            description: 'User isolation test',
            date: new Date().toISOString(),
            type: 'expense',
            categoryId: categoryId,
        };

        const createResponse = await authFetch(`${BASE_URL}/api/transactions`, {
            method: 'POST',
            body: JSON.stringify(transaction),
        });

        expect(createResponse.status).toBe(201);
        const created = await createResponse.json();

        // Verify transaction is returned in user's list
        const listResponse = await authFetch(`${BASE_URL}/api/transactions?search=User+isolation+test`);
        const listData = await listResponse.json();

        const found = listData.transactions.find((t: any) => t.id === created.id);
        expect(found).toBeDefined();
    });
});
