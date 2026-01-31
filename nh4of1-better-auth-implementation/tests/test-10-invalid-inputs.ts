/**
 * Test 10: Invalid Input Validation
 * Tests that the auth system properly rejects invalid inputs
 */
import { getAuth } from '../repository_after/src/lib/auth';
import { assert } from './utils';
import { clearAuthData } from './db-utils';

console.log('Running Test 10: Invalid Input Validation');

async function testInvalidInputs() {
    // Clear database before test
    console.log('Clearing database...');
    await clearAuthData();

    const auth = await getAuth();

    // Test 1: Empty email
    console.log('\n1. Testing empty email...');
    try {
        await auth.api.signUpEmail({
            body: {
                email: '',
                password: 'ValidPassword123!',
                name: 'Test User',
                username: 'testuser'
            }
        });
        console.log('❌ Should have rejected empty email');
        process.exit(1);
    } catch (e) {
        console.log('✅ Empty email correctly rejected');
    }

    // Test 2: Invalid email format
    console.log('\n2. Testing invalid email format...');
    try {
        await auth.api.signUpEmail({
            body: {
                email: 'not-an-email',
                password: 'ValidPassword123!',
                name: 'Test User',
                username: 'testuser2'
            }
        });
        console.log('❌ Should have rejected invalid email format');
        process.exit(1);
    } catch (e) {
        console.log('✅ Invalid email format correctly rejected');
    }

    // Test 3: Empty password
    console.log('\n3. Testing empty password...');
    try {
        await auth.api.signUpEmail({
            body: {
                email: 'valid@email.com',
                password: '',
                name: 'Test User',
                username: 'testuser3'
            }
        });
        console.log('❌ Should have rejected empty password');
        process.exit(1);
    } catch (e) {
        console.log('✅ Empty password correctly rejected');
    }

    // Test 4: Short password (if minimum length enforced)
    console.log('\n4. Testing short password...');
    try {
        const result = await auth.api.signUpEmail({
            body: {
                email: `short-pass-${Date.now()}@email.com`,
                password: '123',
                name: 'Test User',
                username: `shortpass_${Date.now()}`
            }
        }) as any;

        if (result?.user) {
            console.log('ℹ️ Short passwords are allowed (no minimum length enforced)');
        }
    } catch (e) {
        console.log('✅ Short password correctly rejected');
    }

    // Test 5: Login with wrong password
    console.log('\n5. Testing login with wrong password...');
    const validEmail = `wrongpass-${Date.now()}@example.com`;
    const validPassword = 'CorrectPassword123!';
    const validUsername = `wrongpass_user_${Date.now()}`;

    // First register a user
    await auth.api.signUpEmail({
        body: {
            email: validEmail,
            password: validPassword,
            name: validUsername,
            username: validUsername
        }
    });

    // Then try to login with wrong password
    try {
        await auth.api.signInEmail({
            body: {
                email: validEmail,
                password: 'WrongPassword999!'
            }
        });
        console.log('❌ Should have rejected wrong password');
        process.exit(1);
    } catch (e) {
        console.log('✅ Wrong password correctly rejected');
    }

    // Test 6: Login with non-existent email
    console.log('\n6. Testing login with non-existent email...');
    try {
        await auth.api.signInEmail({
            body: {
                email: 'nonexistent@email.com',
                password: 'SomePassword123!'
            }
        });
        console.log('❌ Should have rejected non-existent user');
        process.exit(1);
    } catch (e) {
        console.log('✅ Non-existent user correctly rejected');
    }

    console.log('\nTest 10 Invalid Input Validation Finished Successfully');
    process.exit(0);
}

testInvalidInputs().catch(err => {
    console.error('❌ Invalid Input Test Failed:', err.message);
    console.error(err);
    process.exit(1);
});
