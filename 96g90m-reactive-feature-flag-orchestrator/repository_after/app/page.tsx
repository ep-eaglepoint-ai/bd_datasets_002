"use client";

import { useEffect } from "react";
import { useFlagStore } from "@/store/useFlagStore";
import { cn } from "@/lib/utils";
import { FlagType } from "@/lib/schema";
import { AlertCircle, Check, RotateCcw, Save } from "lucide-react";

export default function Home() {
  const {
    draftState,
    isLoading,
    error,
    fetchFlags,
    updateFlagValue,
    updateFlagType,
    sync,
    discard,
    isDirty,
    validationErrors,
  } = useFlagStore();

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  if (isLoading && !draftState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Feature Flag Orchestrator
            </h1>
            <p className="text-gray-400 mt-2">
              Manage application logic with type-safe controls.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {error && (
              <div className="text-red-400 text-sm flex items-center gap-2 bg-red-400/10 px-3 py-1.5 rounded-md border border-red-400/20">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <button
              onClick={discard}
              disabled={!isDirty || isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
            >
              <RotateCcw size={18} />
              Discard
            </button>
            <button
              onClick={sync}
              disabled={
                !isDirty ||
                Object.keys(validationErrors).length > 0 ||
                isLoading
              }
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-md font-semibold transition-all shadow-lg",
                isDirty && Object.keys(validationErrors).length === 0
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed",
              )}
            >
              {isLoading ? (
                "Syncing..."
              ) : (
                <>
                  <Save size={18} />
                  Sync Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Flag List */}
        <div className="space-y-4">
          {draftState?.flags.map((flag) => (
            <div
              key={flag.id}
              className={cn(
                "bg-gray-800/50 border rounded-xl p-6 transition-all",
                validationErrors[flag.id]
                  ? "border-red-500/50 bg-red-500/5"
                  : "border-gray-700 hover:border-gray-600",
              )}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Meta Info */}
                <div className="md:col-span-1 space-y-2">
                  <div className="font-mono text-sm text-blue-400">
                    {flag.key}
                  </div>
                  <div className="text-sm text-gray-400">
                    {flag.description}
                  </div>

                  {/* Type Selector */}
                  <select
                    value={flag.type}
                    onChange={(e) =>
                      updateFlagType(flag.id, e.target.value as FlagType)
                    }
                    className="mt-2 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 outline-none focus:border-blue-500"
                  >
                    <option value="BOOLEAN">BOOLEAN</option>
                    <option value="PERCENTAGE">PERCENTAGE</option>
                    <option value="ENUM">ENUM</option>
                  </select>
                </div>

                {/* Input Area */}
                <div className="md:col-span-2 flex flex-col justify-center">
                  {flag.type === "BOOLEAN" && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateFlagValue(flag.id, !flag.value)}
                        className={cn(
                          "w-12 h-6 rounded-full p-1 transition-colors relative",
                          flag.value ? "bg-green-500" : "bg-gray-600",
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                            flag.value ? "translate-x-6" : "translate-x-0",
                          )}
                        />
                      </button>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          flag.value ? "text-green-400" : "text-gray-400",
                        )}
                      >
                        {flag.value ? "ENABLED" : "DISABLED"}
                      </span>
                    </div>
                  )}

                  {flag.type === "PERCENTAGE" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Rollout</span>
                        <span className="font-mono text-blue-400">
                          {flag.value}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={flag.value}
                        onChange={(e) =>
                          updateFlagValue(flag.id, parseInt(e.target.value))
                        }
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      {/* Add explicit number input for edge case testing/precision if needed, or simple valid range */}
                      <input
                        type="number"
                        value={flag.value}
                        onChange={(e) =>
                          updateFlagValue(flag.id, parseInt(e.target.value))
                        }
                        className="w-20 bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded px-2 py-1"
                      />
                    </div>
                  )}

                  {flag.type === "ENUM" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {flag.options.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => updateFlagValue(flag.id, opt)}
                            className={cn(
                              "px-3 py-1.5 text-sm rounded-md border transition-all",
                              flag.value === opt
                                ? "bg-purple-500/20 border-purple-500 text-purple-300"
                                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600",
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Validation Errors */}
                  {validationErrors[flag.id] && (
                    <div className="mt-3 text-red-400 text-xs bg-red-400/10 p-2 rounded border border-red-400/20">
                      {validationErrors[flag.id]}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {draftState?.flags.length === 0 && (
            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
              No flags found. Check your config.json.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
