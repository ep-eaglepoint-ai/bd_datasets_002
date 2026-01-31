/**
 * Database utilities for test cleanup
 * Provides methods to clear auth collections before each test run
 */
import { MongoClient } from 'mongodb';

// Default MongoDB URI - can be overridden by environment variable
const getMongoUri = (): string => {
    return process.env.MONGODB_URI || 'mongodb://localhost:27017/better-auth-test';
};

/**
 * Clear all auth-related collections from the database
 * Call this before tests that create new users to ensure clean state
 */
export async function clearAuthData(): Promise<void> {
    const uri = getMongoUri();
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();

        // Auth collections used by better-auth
        const authCollections = ['user', 'session', 'account', 'verification'];

        for (const collectionName of authCollections) {
            try {
                const collection = db.collection(collectionName);
                await collection.deleteMany({});
                console.log(`  ✓ Cleared collection: ${collectionName}`);
            } catch (e) {
                // Collection might not exist yet, which is fine
            }
        }
    } finally {
        await client.close();
    }
}

/**
 * Get the user collection for verification
 */
export async function getUserCollection() {
    const uri = getMongoUri();
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();
    return { collection: db.collection('user'), client };
}

/**
 * Get the session collection for verification
 */
export async function getSessionCollection() {
    const uri = getMongoUri();
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();
    return { collection: db.collection('session'), client };
}

export { getMongoUri };
