import { readFile, assert } from './utils';

console.log('Running Test 6: No external Credential services');

const authFile = readFile('src/lib/auth.ts');
if (authFile) {
    assert(!authFile.includes('magicLink'), 'Should not use magic links');
    assert(!authFile.includes('phoneNumber'), 'Should not use phone number auth (external service often)');
    assert(!authFile.includes('webauthn'), 'Avoiding complex external/device credential services (simple pass only requested)');
}

console.log('Test 6 Passed');
