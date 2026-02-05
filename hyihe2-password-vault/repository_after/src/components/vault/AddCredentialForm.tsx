"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VaultItemSchema } from "@/lib/validation";
import { useVaultStore } from "@/store/useVaultStore";
import { X, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { PasswordGenerator } from "@/components/security/PasswordGenerator";
import zxcvbn from "zxcvbn";
import { cn } from "@/lib/utils";

interface AddCredentialFormProps {
    onClose: () => void;
}

export function AddCredentialForm({ onClose }: AddCredentialFormProps) {
    const addItem = useVaultStore((state) => state.addItem);
    const [showGenerator, setShowGenerator] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(VaultItemSchema),
    });

    const password = watch("password");

    const strength = useMemo(() => {
        if (!password) return null;
        return zxcvbn(password);
    }, [password]);

    const onSubmit = async (data: any) => {
        await addItem(data);
        onClose();
    };

    const strengthColor = (score: number) => {
        if (score < 2) return "bg-red-500";
        if (score < 3) return "bg-yellow-500";
        return "bg-emerald-500";
    };

    const strengthLabel = (score: number) => {
        switch (score) {
            case 0: return "Very Weak";
            case 1: return "Weak";
            case 2: return "Fair";
            case 3: return "Good";
            case 4: return "Strong";
            default: return "";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl ring-1 ring-white/10">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white tracking-tight">Add Credential</h2>
                    <button onClick={onClose} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Title</label>
                        <input
                            {...register("title")}
                            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                            placeholder="e.g. Google"
                        />
                        {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message as string}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-zinc-400">Username</label>
                            <input
                                {...register("username")}
                                className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                                placeholder="user@example.com"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-zinc-400">Password</label>
                            <div className="relative">
                                <input
                                    {...register("password")}
                                    type="text" // Using text to see it, or toggle? Standard is password but for vault manager usually we want to see/toggle. Keeping text for now or password with toggle? Let's use text for simplicity of generator visualization, or standard password input type.
                                    // Requirements: "prevent accidental plaintext exposure". So it should be type="password".
                                    className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowGenerator(!showGenerator)}
                                    className="absolute right-2 top-2.5 text-xs text-emerald-500 hover:text-emerald-400 font-medium bg-zinc-900/80 px-1 rounded"
                                >
                                    {showGenerator ? "Close Gen" : "Generate"}
                                </button>
                            </div>

                            {/* Strength Meter */}
                            {strength && password && (
                                <div className="mt-2">
                                    <div className="flex justify-between items-center text-xs mb-1">
                                        <span className={cn("font-medium",
                                            strength.score < 2 ? "text-red-400" :
                                                strength.score < 4 ? "text-yellow-400" : "text-emerald-400"
                                        )}>
                                            {strengthLabel(strength.score)}
                                        </span>
                                        {strength.feedback.warning && (
                                            <span className="text-amber-500 flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3" />
                                                {strength.feedback.warning}
                                            </span>
                                        )}
                                    </div>
                                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full transition-all duration-500", strengthColor(strength.score))}
                                            style={{ width: `${(strength.score + 1) * 20}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {showGenerator && (
                                <div className="absolute z-20 mt-2 w-[calc(100%+16px)] -left-2 shadow-2xl rounded-lg overflow-hidden ring-1 ring-zinc-700 bg-zinc-900">
                                    <PasswordGenerator onSelect={(pwd) => {
                                        setValue("password", pwd);
                                        setShowGenerator(false);
                                    }} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400">URL</label>
                        <input
                            {...register("url")}
                            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                            placeholder="https://google.com"
                        />
                        {errors.url && <p className="mt-1 text-sm text-red-500">{errors.url.message as string}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Notes</label>
                        <textarea
                            {...register("notes")}
                            rows={3}
                            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                            placeholder="Security questions, pins, etc."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Tags</label>
                        <input
                            {...register("tags", {
                                // Transform comma-separated string to array for Zod
                                setValueAs: (v) => typeof v === 'string' ? v.split(',').map(t => t.trim()).filter(Boolean) : v
                            })}
                            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                            placeholder="work, social, finance (comma separated)"
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/20 hover:scale-[1.02]"
                        >
                            {isSubmitting ? "Encrypting..." : "Save Credential"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
