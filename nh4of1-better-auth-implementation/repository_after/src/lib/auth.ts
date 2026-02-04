import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { username } from "better-auth/plugins";
import clientPromise from "./mongodb";

let _auth: any;
let _initPromise: Promise<any> | null = null;

export const getAuth = async () => {
    // First check (without lock)
    if (_auth) {
        return _auth;
    }

    // Lock acquisition (simulated by checking/setting the promise)
    if (!_initPromise) {
        _initPromise = (async () => {
            const client = await clientPromise;
            const db = client.db();
            return betterAuth({
                baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
                trustedOrigins: [
                    "http://localhost:3000",
                    process.env.BETTER_AUTH_URL || "http://localhost:3000"
                ],
                database: mongodbAdapter(db),
                emailAndPassword: {
                    enabled: true
                },
                plugins: [
                    username()
                ]
            });
        })();
    }

    const authInstance = await _initPromise;

    // Second check (inside "lock" / after critical section)
    if (!_auth) {
        _auth = authInstance;
    }

    return _auth;
};
