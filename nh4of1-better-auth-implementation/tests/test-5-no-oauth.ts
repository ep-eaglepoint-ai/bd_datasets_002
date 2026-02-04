import { readFile, assert } from './utils';

console.log('Running Test 5: No OAuth providers');

const authFile = readFile('src/lib/auth.ts');
assert(authFile !== null, 'src/lib/auth.ts not found');

if (authFile) {
    const commonOAuth = ['google', 'github', 'apple', 'facebook'];
    commonOAuth.forEach(provider => {
        const regex = new RegExp(`${provider}\\s*:\\s*{`);
        assert(!regex.test(authFile), `Must not enable ${provider} OAuth provider`);
    });
}

const envFile = readFile('.env');
if (envFile) {
    // Check for common OAuth env vars
    assert(!envFile.includes('GOOGLE_CLIENT_ID'), 'Should not have GOOGLE_CLIENT_ID');
    assert(!envFile.includes('GITHUB_CLIENT_ID'), 'Should not have GITHUB_CLIENT_ID');
}

console.log('Test 5 Passed');
