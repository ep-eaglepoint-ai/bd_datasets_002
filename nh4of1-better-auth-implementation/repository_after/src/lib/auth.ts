import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import clientPromise from "./mongodb";

export const auth = betterAuth({
    database: mongodbAdapter(clientPromise),
    emailAndPassword: {
        enabled: true
    }
});
