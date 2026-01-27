"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SignUp() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const router = useRouter();

    const handleSignUp = async () => {
        await authClient.signUp.email({
            email,
            password,
            name: username, // Using username as name
            username,
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
            <h1>Sign Up</h1>
            <input
                type="text"
                placeholder="Username"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
            />
            <input
                type="email"
                placeholder="Email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
            />
            <input
                type="password"
                placeholder="Password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
            />
            <button id="sign-up-button" onClick={handleSignUp} style={{ padding: "0.5rem 1rem" }}>Sign Up</button>
        </div>
    );
}
