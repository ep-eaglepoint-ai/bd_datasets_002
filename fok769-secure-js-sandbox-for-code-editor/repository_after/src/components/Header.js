import React from 'react';
import { Copy, Download, Upload, RotateCcw, Play } from 'lucide-react';

export default function Header({ 
  language, 
  onLanguageChange, 
  onExecute, 
  onCopy, 
  onDownload, 
  onUpload, 
  onReset, 
  isExecuting 
}) {
  return (
    <div className="bg-gray-800 rounded-t-lg p-4 border-b border-gray-700">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Code Editor</h1>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Run Code"
          >
            <Play size={16} />
            {isExecuting ? 'Running...' : 'Run'}
          </button>
          
          <button
            onClick={onCopy}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
            title="Copy Code"
          >
            <Copy size={16} />
            Copy
          </button>
          
          <label className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors cursor-pointer text-sm">
            <Upload size={16} />
            Upload
            <input
              type="file"
              onChange={onUpload}
              className="hidden"
              accept=".js,.py,.html,.css,.json,.txt"
            />
          </label>
          
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            title="Download Code"
          >
            <Download size={16} />
            Download
          </button>
          
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            title="Reset Code"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
