/**
 * Test 11: Duplicate User Prevention
 * Tests that the auth system prevents duplicate email and username registrations
 */
import { getAuth } from '../repository_after/src/lib/auth';
import { assert } from './utils';
import { clearAuthData } from './db-utils';

console.log('Running Test 11: Duplicate User Prevention');

async function testDuplicates() {
    // Clear database before test
    console.log('Clearing database...');
    await clearAuthData();

    const auth = await getAuth();
    const timestamp = Date.now();
    const email = `duplicate-test-${timestamp}@example.com`;
    const password = 'TestPassword123!';
    const username = `dup_user_${timestamp}`;

    // 1. Register the first user
    console.log('\n1. Registering first user...');
    const result1 = await auth.api.signUpEmail({
        body: { email, password, name: username, username }
    }) as any;

    assert(!!result1?.user, 'First registration failed');
    console.log('✅ First user registered successfully');

    // 2. Attempt to register with same email
    console.log('\n2. Attempting registration with duplicate email...');
    try {
        await auth.api.signUpEmail({
            body: {
                email,  // Same email
                password: 'DifferentPassword123!',
                name: 'Different Name',
                username: `different_user_${timestamp}`  // Different username
            }
        });
        console.log('❌ Should have rejected duplicate email');
        process.exit(1);
    } catch (e) {
        console.log('✅ Duplicate email correctly rejected');
        console.log(`   Error: ${(e as Error).message}`);
    }

    // 3. Attempt to register with same username
    console.log('\n3. Attempting registration with duplicate username...');
    try {
        await auth.api.signUpEmail({
            body: {
                email: `different-${timestamp}@example.com`,  // Different email
                password: 'AnotherPassword123!',
                name: 'Another Name',
                username  // Same username
            }
        });
        console.log('❌ Should have rejected duplicate username');
        process.exit(1);
    } catch (e) {
        console.log('✅ Duplicate username correctly rejected');
        console.log(`   Error: ${(e as Error).message}`);
    }

    // 4. Verify only one user exists in database
    console.log('\n4. Verifying only one user exists...');
    const { getUserCollection } = await import('./db-utils');
    const { collection, client } = await getUserCollection();
    const userCount = await collection.countDocuments({});
    await client.close();

    assert(userCount === 1, `Expected 1 user, found ${userCount}`);
    console.log('✅ Only one user exists in database');

    // 5. Test case-sensitivity for email (if applicable)
    console.log('\n5. Testing email case-sensitivity...');
    try {
        await auth.api.signUpEmail({
            body: {
                email: email.toUpperCase(),  // Same email, different case
                password: 'CaseSensitiveTest123!',
                name: 'Case Test',
                username: `case_user_${timestamp}`
            }
        });
        console.log('ℹ️ Email check is case-sensitive (uppercase version accepted)');
    } catch (e) {
        console.log('✅ Email check is case-insensitive (uppercase version rejected)');
    }

    console.log('\nTest 11 Duplicate User Prevention Finished Successfully');
    process.exit(0);
}

testDuplicates().catch(err => {
    console.error('❌ Duplicate Prevention Test Failed:', err.message);
    console.error(err);
    process.exit(1);
});
