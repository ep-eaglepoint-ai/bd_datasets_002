import { readFile, assert } from './utils';

console.log('Running Test 4: Sessions and auth states handling');

// Check for client-side session hook usage
const pageFile = readFile('src/app/page.tsx');
assert(pageFile !== null, 'src/app/page.tsx not found');
if (pageFile) {
    assert(pageFile.includes('useSession'), 'Landing page should check session state (useSession)');
}

// Check for server-side session check
const dashboardFile = readFile('src/app/dashboard/page.tsx');
assert(dashboardFile !== null, 'src/app/dashboard/page.tsx not found');
if (dashboardFile) {
    assert(dashboardFile.includes('auth.api.getSession'), 'Dashboard should verify session server-side');
}

console.log('Test 4 Passed');
