"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MasterPasswordSchema } from "@/lib/validation";
import { useVaultStore } from "@/store/useVaultStore";
import { Lock } from "lucide-react";

export function SetupVault() {
    const setupVault = useVaultStore((state) => state.setupVault);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(MasterPasswordSchema),
    });

    const onSubmit = async (data: any) => {
        await setupVault(data.password);
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 text-zinc-100">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center text-center">
                    <div className="rounded-full bg-blue-500/10 p-4">
                        <Lock className="h-10 w-10 text-blue-500" />
                    </div>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight">Create your Vault</h1>
                    <p className="mt-2 text-zinc-400">
                        Set a strong master password. This is the only way to access your data.
                        <span className="block font-medium text-red-400 mt-1">If you forget it, your data is lost forever.</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300">Master Password</label>
                            <input
                                {...register("password")}
                                type="password"
                                className="mt-1 block w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="••••••••••••"
                            />
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-500">{errors.password.message as string}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300">Confirm Password</label>
                            <input
                                {...register("confirmPassword")}
                                type="password"
                                className="mt-1 block w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="••••••••••••"
                            />
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message as string}</p>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? "Creating Vault..." : "Create Vault"}
                    </button>
                </form>
            </div>
        </div>
    );
}
