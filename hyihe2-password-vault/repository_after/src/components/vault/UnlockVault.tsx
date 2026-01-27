"use client";

import { useState } from "react";
import { useVaultStore } from "@/store/useVaultStore";
import { Unlock, AlertCircle } from "lucide-react";

export function UnlockVault() {
    const unlockVault = useVaultStore((state) => state.unlockVault);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const success = await unlockVault(password);
            if (!success) {
                setError("Invalid password. Please try again.");
            }
        } catch (err) {
            setError("An error occurred while unlocking.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 text-zinc-100">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center text-center">
                    <div className="rounded-full bg-emerald-500/10 p-4">
                        <Unlock className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight">Unlock Vault</h1>
                    <p className="mt-2 text-zinc-400">
                        Enter your master password to decrypt your credentials.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300">Master Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="••••••••••••"
                            autoFocus
                        />
                        {error && (
                            <div className="mt-2 flex items-center text-sm text-red-500">
                                <AlertCircle className="mr-1 h-4 w-4" />
                                {error}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !password}
                        className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? "Unlocking..." : "Unlock Vault"}
                    </button>
                </form>
            </div>
        </div>
    );
}
