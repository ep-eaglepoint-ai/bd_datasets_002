"use client";

import { useState } from "react";
import { Download, Upload, Trash2, X, AlertTriangle, Check } from "lucide-react";
import { storage } from "@/lib/storage";
import { useVaultStore } from "@/store/useVaultStore";

interface SettingsModalProps {
    onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const [importStatus, setImportStatus] = useState<string>("");
    const store = useVaultStore();

    const handleExport = async () => {
        try {
            const json = await store.exportVault();
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Export failed", e);
            alert("Failed to export vault.");
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm("Importing will OVERWRITE your current vault. Are you sure?")) {
            return;
        }

        try {
            setImportStatus("Reading file...");
            const text = await file.text();
            
            setImportStatus("Restoring data...");
            await store.importVault(text);

            setImportStatus("Success! Reloading...");
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (err) {
            console.error(err);
            setImportStatus("Error: Invalid backup file");
        }
    };

    const handleWipe = async () => {
        if (confirm("DANGER: This will permanently delete all your data. This cannot be undone. Are you sure?")) {
            await storage.clearAll();
            store.lockVault();
            window.location.reload();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Settings</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Auto Lock Config */}
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                        <h3 className="font-medium text-white mb-2">Auto-Lock Settings</h3>
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-400">Lock after inactivity</label>
                            <select
                                value={store.autoLock.enabled ? store.autoLock.timeoutMinutes : "disabled"}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "disabled") {
                                        store.setAutoLock({ enabled: false, timeoutMinutes: 15 });
                                    } else {
                                        store.setAutoLock({ enabled: true, timeoutMinutes: Number(val) });
                                    }
                                }}
                                className="bg-zinc-950 border border-zinc-700 rounded text-sm text-white px-2 py-1"
                            >
                                <option value="1">1 Minute</option>
                                <option value="5">5 Minutes</option>
                                <option value="15">15 Minutes</option>
                                <option value="30">30 Minutes</option>
                                <option value="60">1 Hour</option>
                                <option value="disabled">Disabled</option>
                            </select>
                        </div>
                    </div>

                    {/* Export */}
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                        <h3 className="flex items-center gap-2 font-medium text-white mb-2">
                            <Download className="h-4 w-4 text-emerald-500" />
                            Export Backup
                        </h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            Download an encrypted backup of your vault. You will need your master password to restore it.
                        </p>
                        <button
                            onClick={handleExport}
                            className="w-full rounded bg-zinc-800 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition"
                        >
                            Download JSON
                        </button>
                    </div>

                    {/* Import */}
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                        <h3 className="flex items-center gap-2 font-medium text-white mb-2">
                            <Upload className="h-4 w-4 text-blue-500" />
                            Import Backup
                        </h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            Restore from a backup file. <span className="text-yellow-500">This will overwrite current data.</span>
                        </p>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <button className="w-full rounded bg-zinc-800 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition">
                                Select Backup File
                            </button>
                        </div>
                        {importStatus && <p className="mt-2 text-xs text-center text-emerald-400">{importStatus}</p>}
                    </div>

                    {/* Danger Zone */}
                    <div className="rounded-lg border border-red-900/30 bg-red-950/10 p-4">
                        <h3 className="flex items-center gap-2 font-medium text-red-500 mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            Danger Zone
                        </h3>
                        <div className="space-y-3">
                            <button
                                onClick={handleWipe}
                                className="w-full rounded bg-red-900/20 py-2 text-sm font-medium text-red-500 hover:bg-red-900/40 transition border border-red-900/50"
                            >
                                Wipe Vault Data
                            </button>

                            {/* Debug Tools */}
                            <div className="pt-4 border-t border-red-900/20">
                                <p className="text-xs text-zinc-500 mb-2 uppercase font-bold tracking-wider">Developer Tools</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const { encryptionKey } = store;
                                                if (!encryptionKey) {
                                                    alert("Unlock vault first");
                                                    return;
                                                }
                                                const { DebugService } = await import("@/lib/debug");
                                                if (confirm("Generate 100 test items?")) {
                                                    await DebugService.seedVault(100, encryptionKey);
                                                    // Force reload items
                                                    window.location.reload();
                                                }
                                            } catch (e) { console.error(e); }
                                        }}
                                        className="flex-1 rounded bg-zinc-800 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                                    >
                                        +100 Items
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const { DebugService } = await import("@/lib/debug");
                                                if (confirm("Corrupt a random item? This will cause decryption errors.")) {
                                                    await DebugService.corruptRandomItem();
                                                    alert("Item corrupted. Reload to check resilience.");
                                                }
                                            } catch (e) { console.error(e); }
                                        }}
                                        className="flex-1 rounded bg-zinc-800 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                                    >
                                        Corrupt Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
