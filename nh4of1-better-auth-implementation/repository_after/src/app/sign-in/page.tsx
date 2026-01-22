"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    const handleSignIn = async () => {
        await authClient.signIn.email({
            email,
            password,
        }, {
            onSuccess: () => {
                router.push("/dashboard");
            },
            onError: (ctx) => {
                alert(ctx.error.message);
            },
        });
    };

    return (
        <div style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto" }}>
            <h1>Sign In</h1>
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
            />
            <button onClick={handleSignIn} style={{ padding: "0.5rem 1rem" }}>Sign In</button>
        </div>
    );
}
