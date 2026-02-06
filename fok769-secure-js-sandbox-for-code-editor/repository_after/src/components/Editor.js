import React from 'react';

export default function Editor({ code, onCodeChange, onKeyDown, lineCount }) {
  return (
    <div className="bg-gray-800 rounded-b-lg overflow-hidden">
      <div className="flex">
        {/* Line Numbers */}
        <div 
          className="px-4 py-4 text-right text-gray-500 select-none bg-gray-850 border-r border-gray-700"
          style={{ minWidth: '60px' }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="leading-6 font-mono text-sm">
              {i + 1}
            </div>
          ))}
        </div>
        
        {/* Code Area */}
        <textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="flex-1 bg-transparent text-green-400 font-mono text-sm resize-none focus:outline-none leading-6 p-4"
          style={{ 
            minHeight: '500px',
            tabSize: 2,
            caretColor: 'white'
          }}
          spellCheck={false}
          placeholder="Start typing your code..."
        />
      </div>
    </div>
  );
}
