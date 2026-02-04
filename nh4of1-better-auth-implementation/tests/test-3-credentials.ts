import { readFile, assert } from './utils';

console.log('Running Test 3: Username, Password and Email only');

const authFile = readFile('src/lib/auth.ts');
assert(authFile !== null, 'src/lib/auth.ts not found');

if (authFile) {
    // Check for emailAndPassword provider
    assert(authFile.includes('emailAndPassword'), 'Should enable emailAndPassword provider');

    // Explicitly check for absence of social providers
    const prohibitedProviders = ['google', 'github', 'facebook', 'twitter', 'discord', 'microsoft', 'spotify', 'twitch'];

    prohibitedProviders.forEach(provider => {
        // Regex looking for provider key in object keys
        const regex = new RegExp(`${provider}\\s*:\\s*{`);
        assert(!regex.test(authFile), `Should not contain ${provider} provider configuration`);
    });
}

console.log('Test 3 Passed');
