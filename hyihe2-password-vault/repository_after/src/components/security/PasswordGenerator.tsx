"use client";

import { useState } from "react";
import { RefreshCw, Copy, Check } from "lucide-react";

interface PasswordGeneratorProps {
    onSelect: (password: string) => void;
}

export function PasswordGenerator({ onSelect }: PasswordGeneratorProps) {
    const [length, setLength] = useState(16);
    const [includeUppercase, setIncludeUppercase] = useState(true);
    const [includeNumbers, setIncludeNumbers] = useState(true);
    const [includeSymbols, setIncludeSymbols] = useState(true);
    const [generatedPassword, setGeneratedPassword] = useState("");

    const generatePassword = () => {
        const lowercase = "abcdefghijklmnopqrstuvwxyz";
        const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";
        const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

        let charset = lowercase;
        if (includeUppercase) charset += uppercase;
        if (includeNumbers) charset += numbers;
        if (includeSymbols) charset += symbols;

        let password = "";
        const array = new Uint32Array(length);
        window.crypto.getRandomValues(array);

        for (let i = 0; i < length; i++) {
            password += charset[array[i] % charset.length];
        }

        setGeneratedPassword(password);
    };

    const handleUse = () => {
        onSelect(generatedPassword);
    };

    return (
        <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-zinc-300">Generator</h3>
                <button type="button" onClick={generatePassword} className="text-emerald-500 hover:text-emerald-400">
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {generatedPassword && (
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex-1 rounded bg-black p-2 text-center font-mono text-emerald-400 break-all text-sm">
                        {generatedPassword}
                    </div>
                    <button
                        type="button"
                        onClick={handleUse}
                        className="rounded bg-emerald-600 p-2 text-white hover:bg-emerald-500 text-xs"
                    >
                        Use
                    </button>
                </div>
            )}

            <div className="space-y-3">
                <div>
                    <label className="flex justify-between text-xs text-zinc-500">
                        <span>Length</span>
                        <span>{length}</span>
                    </label>
                    <input
                        type="range"
                        min="8"
                        max="64"
                        value={length}
                        onChange={(e) => setLength(Number(e.target.value))}
                        className="w-full accent-emerald-500"
                    />
                </div>

                <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-zinc-400">
                        <input type="checkbox" checked={includeUppercase} onChange={(e) => setIncludeUppercase(e.target.checked)} className="accent-emerald-500" />
                        A-Z
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-400">
                        <input type="checkbox" checked={includeNumbers} onChange={(e) => setIncludeNumbers(e.target.checked)} className="accent-emerald-500" />
                        0-9
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-400">
                        <input type="checkbox" checked={includeSymbols} onChange={(e) => setIncludeSymbols(e.target.checked)} className="accent-emerald-500" />
                        !@#
                    </label>
                </div>
            </div>
        </div>
    );
}
