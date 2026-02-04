import { readFile, assert } from './utils';

console.log('Running Test 1: Better-auth usage verification');

const packageJson = readFile('package.json');
assert(packageJson !== null, 'package.json not found');

if (packageJson) {
    const pkg = JSON.parse(packageJson);
    const deps = pkg.dependencies || {};
    assert(!!deps['better-auth'], 'better-auth should be in dependencies');
}

const authFile = readFile('src/lib/auth.ts');
assert(authFile !== null, 'src/lib/auth.ts not found');
if (authFile) {
    assert(authFile.includes('better-auth'), 'auth.ts should import better-auth');
    assert(!authFile.includes('next-auth'), 'Should not use next-auth');
}

console.log('Test 1 Passed');
