import React from "react";

export default function ConsoleOutput({ consoleOutput, error, onClear }) {
  return (
    <div className="mt-4 bg-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-700 px-4 py-2 border-b border-gray-600 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Console Output</h3>
        <button
          type="button"
          onClick={onClear}
          className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
        {consoleOutput.length === 0 && !error && (
          <div className="text-gray-500 text-sm">
            No output yet. Click "Run" to execute your code.
          </div>
        )}
        {consoleOutput.map((item, index) => (
          <div
            key={index}
            className={`text-sm font-mono mb-2 ${
              item.type === "error"
                ? "text-red-400"
                : item.type === "result"
                  ? "text-blue-400"
                  : "text-green-400"
            }`}
          >
            {item.message}
          </div>
        ))}
        {error && (
          <div className="text-sm font-mono text-red-400">Error: {error}</div>
        )}
      </div>
    </div>
  );
}
