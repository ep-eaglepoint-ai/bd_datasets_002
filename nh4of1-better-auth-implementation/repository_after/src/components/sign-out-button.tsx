"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
    const router = useRouter();

    return (
        <button
            onClick={async () => {
                await authClient.signOut({
                    fetchOptions: {
                        onSuccess: () => {
                            router.push("/sign-in");
                        },
                    },
                });
            }}
            className="text-sm font-semibold text-[#5469d4] hover:text-[#1a1f36] transition-colors"
        >
            Sign out
        </button>
    );
}
