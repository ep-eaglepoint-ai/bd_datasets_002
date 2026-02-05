"use client";

import { useVaultStore } from "@/store/useVaultStore";
import { LogOut, Plus, Search, Shield, Settings, Copy, ExternalLink, Trash2, Activity } from "lucide-react";
import { useState } from "react";
import { AddCredentialForm } from "./AddCredentialForm";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { SecurityAnalysis } from "./SecurityAnalysis";
import { cn } from "@/lib/utils";
import { useSecureClipboard } from "@/hooks/useSecureClipboard";
import { useAutoLock } from "@/hooks/useAutoLock";
import { AlertTriangle } from "lucide-react";
import * as ReactWindow from "react-window";
// @ts-ignore
const FixedSizeGrid = (ReactWindow as any).FixedSizeGrid || (ReactWindow as any).default?.FixedSizeGrid;
import { AutoSizer } from "react-virtualized-auto-sizer";
const AutoSizerAny = AutoSizer as any;

export function VaultDashboard() {
    useAutoLock();
    const { lockVault, items, deleteItem } = useVaultStore();
    const [search, setSearch] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const filteredItems = items.filter((item) => {
        const term = search.toLowerCase();
        const matchesText =
            item.data.title.toLowerCase().includes(term) ||
            item.data.username?.toLowerCase().includes(term) ||
            item.data.url?.toLowerCase().includes(term) ||
            item.data.category?.toLowerCase().includes(term);

        const matchesTags = item.data.tags?.some(tag => tag.toLowerCase().includes(term));

        return matchesText || matchesTags;
    });

    const { copy, copiedId } = useSecureClipboard();

    const handleCopy = (text: string, id: string) => {
        copy(text, id);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this credential?")) {
            await deleteItem(id);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-900 text-zinc-100 font-sans">
            {/* Modals */}
            {showAddForm && <AddCredentialForm onClose={() => setShowAddForm(false)} />}
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
            {showAnalysis && <SecurityAnalysis items={items} onClose={() => setShowAnalysis(false)} />}

            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 sticky top-0 z-10 backdrop-blur-md bg-opacity-80">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-emerald-500/10 p-2 rounded-full">
                            <Shield className="h-6 w-6 text-emerald-500" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Secure Vault</h1>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={() => setShowAnalysis(true)}
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800 transition"
                            title="Security Audit"
                        >
                            <Activity className="h-4 w-4" />
                            Audit
                        </button>

                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
                            title="Settings"
                        >
                            <Settings className="h-5 w-5" />
                        </button>
                        <button
                            onClick={lockVault}
                            className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm font-medium hover:bg-zinc-700 transition"
                        >
                            <LogOut className="h-4 w-4" />
                            Lock
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-7xl p-6">
                {/* Actions & Search */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search vault..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-zinc-800 bg-zinc-950/50 py-2 pl-9 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/20 transition-all active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        Add Credential
                    </button>
                </div>

                {/* Grid */}
                {filteredItems.length === 0 ? (
                    <div className="mt-20 flex flex-col items-center justify-center text-zinc-500">
                        <Shield className="h-16 w-16 opacity-10" />
                        <p className="mt-4 text-lg font-medium text-zinc-400">Your vault is empty</p>
                        <div className="mt-2 flex items-center gap-2">
                            <p className="text-sm">Click</p>
                            <div className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">+ Add Credential</div>
                            <p className="text-sm">to get started.</p>
                        </div>
                    </div>
                ) : (

                    <div className="h-[calc(100vh-200px)] w-full">
                        <AutoSizerAny>
                            {({ height, width }: { height: number; width: number }) => {
                                const COLUMN_GAP = 16;
                                const ROW_GAP = 16;
                                
                                let columnCount = 1;
                                if (width >= 1024) columnCount = 3;
                                else if (width >= 640) columnCount = 2;

                                const itemWidth = (width - (COLUMN_GAP * (columnCount - 1))) / columnCount;
                                const rowCount = Math.ceil(filteredItems.length / columnCount);
                                const itemHeight = 320; 

                                return (
                                    <FixedSizeGrid
                                        columnCount={columnCount}
                                        columnWidth={itemWidth + COLUMN_GAP}
                                        height={height}
                                        rowCount={rowCount}
                                        rowHeight={itemHeight + ROW_GAP}
                                        width={width}
                                        itemData={{ items: filteredItems, columnCount }}
                                    >
                                        {({ columnIndex, rowIndex, style, data }: { columnIndex: number; rowIndex: number; style: React.CSSProperties; data: any }) => {
                                            const index = rowIndex * data.columnCount + columnIndex;
                                            if (index >= data.items.length) return null;
                                            
                                            const item = data.items[index];
                                            const itemStyle = {
                                                ...style,
                                                width: itemWidth,
                                                height: itemHeight,
                                            };

                                            return (
                                                <div style={itemStyle}>
                                                    <div className="group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-xl hover:shadow-black/20 h-full">
                                                        <div>
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 font-bold text-zinc-500 ring-1 ring-white/5 transition-colors group-hover:bg-zinc-800 group-hover:text-emerald-500">
                                                                    {item.data.title.substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <div className="flex gap-1 opacity-100 sm:opacity-0 transition-opacity group-hover:opacity-100">
                                                                    {item.data.url && (
                                                                        <a href={item.data.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800">
                                                                            <ExternalLink className="h-4 w-4" />
                                                                        </a>
                                                                    )}
                                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="mt-4">
                                                                <div className="flex flex-wrap gap-2 mb-2">
                                                                    {item.data.category && (
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                                            {item.data.category}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h3 className="text-lg font-semibold text-white tracking-tight">{item.data.title}</h3>
                                                                <p className="text-sm text-zinc-400 truncate">{item.data.username || "No username"}</p>
                                                            </div>                
                                                        </div>

                                                        <div className="mt-6 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-950/50 px-2 py-1 rounded">
                                                                <span className="font-mono tracking-widest">••••••••</span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleCopy(item.data.password || "", item.id)}
                                                                className={cn(
                                                                    "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors",
                                                                    copiedId === item.id
                                                                        ? "text-emerald-400 bg-emerald-400/10"
                                                                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                                                                )}
                                                            >
                                                                {copiedId === item.id ? <><Shield className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    </FixedSizeGrid>
                                );
                            }}
                        </AutoSizerAny>
                    </div>
                )}
            </main>
        </div>
    );
}
