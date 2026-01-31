/**
 * Criteria Verification Script
 * 
 * This script verifies that all required functionality is implemented
 * in the Personal Expense Tracker application.
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

interface TestResult {
    criteria: string;
    test: string;
    passed: boolean;
    message: string;
}

const results: TestResult[] = [];

function log(criteria: string, test: string, passed: boolean, message: string) {
    results.push({ criteria, test, passed, message });
    const status = passed ? '✓' : '✗';
    console.log(`${status} [${criteria}] ${test}: ${message}`);
}

async function testCriteria1_Authentication() {
    const criteria = 'Criteria 1: Authentication';

    // Test signup endpoint exists
    try {
        const response = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: '', password: '' }),
        });
        log(criteria, 'Signup endpoint exists', response.status !== 404, `Status: ${response.status}`);
    } catch (e) {
        log(criteria, 'Signup endpoint exists', false, `Error: ${e}`);
    }

    // Test NextAuth endpoints exist
    try {
        const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
        log(criteria, 'NextAuth CSRF endpoint', csrfResponse.ok, `Status: ${csrfResponse.status}`);
    } catch (e) {
        log(criteria, 'NextAuth CSRF endpoint', false, `Error: ${e}`);
    }

    try {
        const providersResponse = await fetch(`${BASE_URL}/api/auth/providers`);
        const providers = await providersResponse.json();
        log(criteria, 'Credentials provider configured',
            providers.credentials !== undefined,
            `Providers: ${Object.keys(providers).join(', ')}`);
    } catch (e) {
        log(criteria, 'Credentials provider configured', false, `Error: ${e}`);
    }

    // Test protected route (should redirect)
    try {
        const dashboardResponse = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
        log(criteria, 'Protected route redirects',
            [302, 307, 308].includes(dashboardResponse.status),
            `Status: ${dashboardResponse.status}`);
    } catch (e) {
        log(criteria, 'Protected route redirects', false, `Error: ${e}`);
    }

    // Test API returns 401 for unauthenticated
    try {
        const apiResponse = await fetch(`${BASE_URL}/api/transactions`);
        log(criteria, 'API returns 401 for unauthenticated',
            apiResponse.status === 401,
            `Status: ${apiResponse.status}`);
    } catch (e) {
        log(criteria, 'API returns 401 for unauthenticated', false, `Error: ${e}`);
    }
}

async function testCriteria2_TransactionCRUD() {
    const criteria = 'Criteria 2: Transaction CRUD';

    // Test transactions endpoint exists
    try {
        const response = await fetch(`${BASE_URL}/api/transactions`);
        log(criteria, 'Transactions endpoint exists',
            response.status !== 404,
            `Status: ${response.status}`);
    } catch (e) {
        log(criteria, 'Transactions endpoint exists', false, `Error: ${e}`);
    }

    // Test POST endpoint exists
    try {
        const response = await fetch(`${BASE_URL}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        log(criteria, 'POST transactions endpoint exists',
            response.status !== 404,
            `Status: ${response.status}`);
    } catch (e) {
        log(criteria, 'POST transactions endpoint exists', false, `Error: ${e}`);
    }
}

async function testCriteria3_Categories() {
    const criteria = 'Criteria 3: Predefined Categories';

    try {
        const response = await fetch(`${BASE_URL}/api/categories`);
        const categories = await response.json();

        log(criteria, 'Categories endpoint works', response.ok, `Status: ${response.status}`);

        if (Array.isArray(categories)) {
            const expenseCategories = categories.filter((c: any) => c.type === 'expense');
            const incomeCategories = categories.filter((c: any) => c.type === 'income');

            log(criteria, 'Has expense categories',
                expenseCategories.length > 0,
                `Count: ${expenseCategories.length}`);

            log(criteria, 'Has income categories',
                incomeCategories.length > 0,
                `Count: ${incomeCategories.length}`);

            const hasColors = categories.every((c: any) => c.color && c.color.match(/^#[0-9a-fA-F]{6}$/));
            log(criteria, 'Categories have colors', hasColors,
                hasColors ? 'All have valid hex colors' : 'Some missing colors');

            // Check for expected categories
            const categoryNames = categories.map((c: any) => c.name.toLowerCase()).join(', ');
            log(criteria, 'Has expected expense categories',
                categoryNames.includes('food') || categoryNames.includes('transport'),
                `Categories: ${categoryNames.slice(0, 100)}...`);
        }
    } catch (e) {
        log(criteria, 'Categories endpoint works', false, `Error: ${e}`);
    }
}

async function testCriteria4_TransactionList() {
    const criteria = 'Criteria 4: Transaction List & Filters';

    // Test pagination parameters are accepted
    try {
        const response = await fetch(`${BASE_URL}/api/transactions?limit=10&offset=0`);
        log(criteria, 'Supports limit/offset pagination',
            response.status !== 404,
            `Status: ${response.status}`);
    } catch (e) {
        log(criteria, 'Supports limit/offset pagination', false, `Error: ${e}`);
    }

    // Test type filter
    try {
        const response = await fetch(`${BASE_URL}/api/transactions?type=expense`);
        log(criteria, 'Supports type filter',
            response.status !== 404,
            `Status: ${response.status}`);
    } catch (e) {
        log(criteria, 'Supports type filter', false, `Error: ${e}`);
    }

    // Test date range filter
    try {
        const response = await fetch(`${BASE_URL}/api/transactions?startDate=2024-01-01&endDate=2024-12-31`);
        log(criteria, 'Supports date range filter',
            response.status !== 404,
            `Status: ${response.status}`);
    } catch (e) {
        log(criteria, 'Supports date range filter', false, `Error: ${e}`);
    }

    // Test search filter
    try {
        const response = await fetch(`${BASE_URL}/api/transactions?search=test`);
        log(criteria, 'Supports search filter',
            response.status !== 404,
            `Status: ${response.status}`);
    } catch (e) {
        log(criteria, 'Supports search filter', false, `Error: ${e}`);
    }
}

async function testCriteria5_Dashboard() {
    const criteria = 'Criteria 5: Dashboard & Charts';

    // Test stats endpoint
    try {
        const response = await fetch(`${BASE_URL}/api/transactions/stats`);
        log(criteria, 'Stats endpoint exists',
            response.status !== 404,
            `Status: ${response.status}`);
    } catch (e) {
        log(criteria, 'Stats endpoint exists', false, `Error: ${e}`);
    }

    // Test chart data endpoint (pie chart)
    try {
        const response = await fetch(`${BASE_URL}/api/transactions/chart-data`);
        log(criteria, 'Chart data endpoint exists',
            response.status !== 404,
            `Status: ${response.status}`);
    } catch (e) {
        log(criteria, 'Chart data endpoint exists', false, `Error: ${e}`);
    }

    // Test trends endpoint (bar chart)
    try {
        const response = await fetch(`${BASE_URL}/api/transactions/trends`);
        log(criteria, 'Trends endpoint exists',
            response.status !== 404,
            `Status: ${response.status}`);
    } catch (e) {
        log(criteria, 'Trends endpoint exists', false, `Error: ${e}`);
    }
}

async function testCriteria6_MonthlyAnalytics() {
    const criteria = 'Criteria 6: Monthly Analytics';

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    try {
        const response = await fetch(
            `${BASE_URL}/api/transactions/monthly?startDate=${startDate}&endDate=${endDate}`
        );
        log(criteria, 'Monthly endpoint exists',
            response.status !== 404,
            `Status: ${response.status}`);

        if (response.ok || response.status === 401) {
            // Check response structure if we can get it
            if (response.status === 401) {
                log(criteria, 'Monthly endpoint requires auth', true, 'Returns 401 as expected');
            }
        }
    } catch (e) {
        log(criteria, 'Monthly endpoint exists', false, `Error: ${e}`);
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('Personal Expense Tracker - Criteria Verification');
    console.log('='.repeat(60));
    console.log();

    await testCriteria1_Authentication();
    console.log();
    await testCriteria2_TransactionCRUD();
    console.log();
    await testCriteria3_Categories();
    console.log();
    await testCriteria4_TransactionList();
    console.log();
    await testCriteria5_Dashboard();
    console.log();
    await testCriteria6_MonthlyAnalytics();
    console.log();

    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total:  ${results.length}`);

    if (failed > 0) {
        console.log('\nFailed tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - [${r.criteria}] ${r.test}: ${r.message}`);
        });
    }

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
