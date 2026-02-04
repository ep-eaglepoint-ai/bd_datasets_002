import { readFile, assert } from './utils';

console.log('Running Test 7: No third party UI');

const packageJson = readFile('package.json');
if (packageJson) {
    const pkg = JSON.parse(packageJson);
    const deps = pkg.dependencies || {};

    assert(!deps['@clerk/nextjs'], 'Should not use Clerk');
    assert(!deps['@auth0/nextjs-auth0'], 'Should not use Auth0');
    assert(!deps['@supabase/auth-ui-react'], 'Should not use Supabase Auth UI');
}

const signInPage = readFile('src/app/sign-in/page.tsx');
assert(signInPage !== null, 'Sign In page must exist');
if (signInPage) {
    assert(signInPage.includes('<input'), 'Sign In page should contain local input fields');
    assert(signInPage.includes('handleSignIn'), 'Sign In page should have local handler');
}

const signUpPage = readFile('src/app/sign-up/page.tsx');
assert(signUpPage !== null, 'Sign Up page must exist');
if (signUpPage) {
    assert(signUpPage.includes('<input'), 'Sign Up page should contain local input fields');
}

console.log('Test 7 Passed');
