import React from 'react';

export default function StatsBar({ lineCount, characterCount, language }) {
  return (
    <div className="mt-4 bg-gray-800 rounded-lg p-3 flex items-center justify-between text-sm">
      <div className="flex gap-6 text-gray-400">
        <span>Lines: <span className="text-white font-mono">{lineCount}</span></span>
        <span>Characters: <span className="text-white font-mono">{characterCount}</span></span>
        <span>Language: <span className="text-white font-mono">{language}</span></span>
      </div>
      <div className="text-gray-500 text-xs">
        Press Tab for indentation
      </div>
    </div>
  );
}
