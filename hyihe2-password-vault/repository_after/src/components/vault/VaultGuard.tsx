"use client";

import { useEffect, useState } from "react";
import { useVaultStore } from "@/store/useVaultStore";
import { SetupVault } from "./SetupVault";
import { UnlockVault } from "./UnlockVault";
import { Loader2 } from "lucide-react";

export function VaultGuard({ children }: { children: React.ReactNode }) {
    const { hasVault, isLocked, isLoading, initialize, lockVault } = useVaultStore();

    // Prevent hydration errors by ensuring we only render client-side logic after mount
    const [mounted, setMounted] = useState(false);

    // Auto-lock on inactivity
    useEffect(() => {
        if (isLocked) return;

        let timeout: NodeJS.Timeout;
        const LOCK_TIME = 5 * 60 * 1000; // 5 minutes

        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                console.log("Auto-locking due to inactivity");
                lockVault();
            }, LOCK_TIME);
        };

        // Events to detect activity
        const events = ["mousedown", "keypress", "scroll", "touchstart"];
        events.forEach(event => window.addEventListener(event, resetTimer));

        resetTimer(); // Start timer

        return () => {
            clearTimeout(timeout);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [isLocked, lockVault]);

    useEffect(() => {
        setMounted(true);
        initialize();
    }, [initialize]);

    if (!mounted || isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!hasVault) {
        return <SetupVault />;
    }

    if (isLocked) {
        return <UnlockVault />;
    }

    return <>{children}</>;
}
