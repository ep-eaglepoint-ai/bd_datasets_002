"use client";

import { DecryptedVaultItem } from "@/lib/types";
import { X, ShieldAlert, ShieldCheck, AlertTriangle, Fingerprint, Flame } from "lucide-react";
import { useMemo, useState } from "react";
import zxcvbn from "zxcvbn";
import { cn } from "@/lib/utils";

interface SecurityAnalysisProps {
    items: DecryptedVaultItem[];
    onClose: () => void;
}

export function SecurityAnalysis({ items, onClose }: SecurityAnalysisProps) {
    const analysis = useMemo(() => {
        let weakCount = 0;
        const passwordMap = new Map<string, string[]>(); // password -> item ids
        const reusedIds = new Set<string>();
        const weakIds = new Set<string>();

        items.forEach((item) => {
            const pwd = item.data.password;
            if (!pwd) return;

            // Strength Check
            const strength = zxcvbn(pwd);
            if (strength.score < 3) {
                weakCount++;
                weakIds.add(item.id);
            }

            // Reuse Check
            const existing = passwordMap.get(pwd) || [];
            passwordMap.set(pwd, [...existing, item.id]);
        });

        passwordMap.forEach((ids) => {
            if (ids.length > 1) {
                ids.forEach((id) => reusedIds.add(id));
            }
        });

        return {
            total: items.length,
            weak: weakCount,
            reused: reusedIds.size, // This accounts for ALL items involved in reuse
            weakItems: items.filter((i) => weakIds.has(i.id)),
            reusedItems: items.filter((i) => reusedIds.has(i.id) && i.data.password), // Filter out empty passwords just in case
        };
    }, [items]);

    const [activeTab, setActiveTab] = useState<"overview" | "weak" | "reused" | "simulation">("overview");

    const simulation = useMemo(() => {
        // Group by password
        const groups: { password: string, items: DecryptedVaultItem[] }[] = [];
        const map = new Map<string, DecryptedVaultItem[]>();
        
        items.forEach(i => {
           if(i.data.password) {
               const list = map.get(i.data.password) || [];
               map.set(i.data.password, [...list, i]);
           } 
        });

        // Find largest groups
        map.forEach((list, pwd) => {
            if (list.length > 1) {
                groups.push({ password: pwd, items: list });
            }
        });

        return groups.sort((a, b) => b.items.length - a.items.length);

    }, [items]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Security Audit</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex gap-4 border-b border-zinc-800 pb-4 mb-4">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={cn("px-3 py-1 rounded text-sm font-medium transition", activeTab === "overview" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200")}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("weak")}
                        className={cn("px-3 py-1 rounded text-sm font-medium transition", activeTab === "weak" ? "bg-red-900/20 text-red-400" : "text-zinc-400 hover:text-zinc-200")}
                    >
                        Weak ({analysis.weak})
                    </button>
                    <button
                        onClick={() => setActiveTab("reused")}
                        className={cn("px-3 py-1 rounded text-sm font-medium transition", activeTab === "reused" ? "bg-yellow-900/20 text-yellow-400" : "text-zinc-400 hover:text-zinc-200")}
                    >
                        Reused ({analysis.reused})
                    </button>
                    <button
                        onClick={() => setActiveTab("simulation")}
                        className={cn("px-3 py-1 rounded text-sm font-medium transition", activeTab === "simulation" ? "bg-orange-900/20 text-orange-400" : "text-zinc-400 hover:text-zinc-200")}
                    >
                        Breach Sim
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    {activeTab === "overview" && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center">
                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                                    <ShieldCheck className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="text-2xl font-bold text-white">{analysis.total}</div>
                                <div className="text-xs text-zinc-500">Total Items</div>
                            </div>
                            <div className="rounded-lg border border-red-900/30 bg-red-900/10 p-4 text-center">
                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                                    <ShieldAlert className="h-5 w-5 text-red-500" />
                                </div>
                                <div className="text-2xl font-bold text-red-400">{analysis.weak}</div>
                                <div className="text-xs text-red-400/70">Weak Passwords</div>
                            </div>
                            <div className="rounded-lg border border-yellow-900/30 bg-yellow-900/10 p-4 text-center">
                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
                                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                </div>
                                <div className="text-2xl font-bold text-yellow-400">{analysis.reused}</div>
                                <div className="text-xs text-yellow-400/70">Reused Items</div>
                            </div>

                            <div className="col-span-1 sm:col-span-3 mt-4 rounded-lg bg-zinc-900 p-4">
                                <h3 className="text-sm font-medium text-white mb-2">Health Score</h3>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    {/* Simple heuristic score */}
                                    <div
                                        className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500"
                                        style={{ width: `${Math.max(0, 100 - (analysis.weak * 10 + analysis.reused * 5))}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-zinc-500">
                                    Based on weak and reused passwords. Aim for 100%.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === "weak" && (
                        <div className="space-y-2">
                            {analysis.weakItems.length === 0 ? (
                                <p className="text-zinc-500 text-center py-8">No weak passwords found. Good job!</p>
                            ) : (
                                analysis.weakItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 p-3">
                                        <div>
                                            <div className="font-medium text-white">{item.data.title}</div>
                                            <div className="text-xs text-zinc-500">{item.data.username}</div>
                                        </div>
                                        <div className="text-xs font-mono text-red-400 bg-red-900/10 px-2 py-1 rounded">Weak</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === "reused" && (
                        <div className="space-y-2">
                            {analysis.reusedItems.length === 0 ? (
                                <p className="text-zinc-500 text-center py-8">No reused passwords found. Excellent!</p>
                            ) : (
                                analysis.reusedItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 p-3">
                                        <div>
                                            <div className="font-medium text-white">{item.data.title}</div>
                                            <div className="text-xs text-zinc-500">{item.data.username}</div>
                                        </div>
                                        <div className="text-xs font-mono text-yellow-400 bg-yellow-900/10 px-2 py-1 rounded">Reused</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === "simulation" && (
                        <div className="space-y-4">
                            <div className="rounded-lg bg-zinc-900 p-4 border border-zinc-800">
                                <h3 className="flex items-center gap-2 font-medium text-white mb-2">
                                    <Flame className="h-4 w-4 text-orange-500" />
                                    Blast Radius Analysis
                                </h3>
                                <p className="text-sm text-zinc-400">
                                    Simulating a "Credential Stuffing" attack. If one password is breached, these groups of accounts would be simultaneously compromised.
                                </p>
                            </div>
                            
                            {simulation.length === 0 ? (
                                <p className="text-zinc-500 text-center py-8">No reuse clusters found. High resilience!</p>
                            ) : (
                                simulation.map((group, idx) => (
                                    <div key={idx} className="rounded-lg border border-red-900/20 bg-red-950/10 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Fingerprint className="h-4 w-4 text-red-500" />
                                                <span className="font-mono text-sm text-red-400">
                                                    Cluster #{idx + 1}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">
                                                {group.items.length} Accounts at Risk
                                            </span>
                                        </div>
                                        <div className="space-y-2 pl-6 border-l-2 border-red-900/30">
                                            {group.items.map(item => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span className="text-zinc-300">{item.data.title}</span>
                                                    <span className="text-zinc-500 text-xs">{item.data.username}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
