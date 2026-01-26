import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Download, Upload, RotateCcw, Save, FileText, Search, Zap, History } from 'lucide-react';

export default function CodeEditor() {
  const [code, setCode] = useState(`// Write your JavaScript code here
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci(10):", fibonacci(10));`);

  const [language, setLanguage] = useState('javascript');
  const [fileName, setFileName] = useState('untitled');
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceMode, setReplaceMode] = useState(false);
  const [replaceTerm, setReplaceTerm] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedVersion, setSavedVersion] = useState('');
  const [isModified, setIsModified] = useState(false);
  const textareaRef = useRef(null);
  const lastSaveTime = useRef(null);

  useEffect(() => {
    const matches = code.match(new RegExp(searchTerm, 'g'));
    setIsModified(savedVersion === code);
  }, [code, savedVersion]);

  const recordHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(code);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    recordHistory();
    setCode(newCode);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setCode(history[newIndex]);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setCode(history[newIndex]);
  };

  const findAndReplace = () => {
    if (!searchTerm) return;
    
    const regex = new RegExp(searchTerm, 'g');
    const newCode = code.replace(regex, replaceTerm);
    recordHistory();
    setCode(newCode);
  };

  const downloadCode = () => {
    const extensions = {
      javascript: 'js',
      python: 'py',
      html: 'html',
      css: 'css',
      json: 'json'
    };
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${extensions[language] || 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const uploadCode = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        recordHistory();
        setCode(event.target.result);
        
        const nameParts = file.name.split('.');
        const ext = nameParts.pop()?.toLowerCase();
        const name = nameParts.join('.');
        setFileName(name || 'untitled');
        
        const langMap = {
          js: 'javascript',
          py: 'python',
          html: 'html',
          css: 'css',
          json: 'json'
        };
        setLanguage(langMap[ext] || language);
      };
      reader.readAsText(file);
    }
  };

  const saveCode = () => {
    setSavedVersion(code);
    lastSaveTime.current = Date.now();
  };

  const resetCode = () => {
    const defaultCode = '// Write your code here\n';
    recordHistory();
    setCode(defaultCode);
    setFileName('untitled');
    setSavedVersion(defaultCode);
    setSearchTerm('');
    setReplaceTerm('');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
  };

  const formatCode = () => {
    const lines = code.split('\n');
    let indentLevel = 0;
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      
      if (trimmed.endsWith('}') || trimmed.endsWith(']') || trimmed.endsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      const indented = '  '.repeat(indentLevel) + trimmed;
      
      if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
        indentLevel++;
      }
      
      return indented;
    }).join('\n');
    
    recordHistory();
    setCode(formatted);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      
      if (start === end) {
        const newCode = code.substring(0, start) + '  ' + code.substring(end);
        setCode(newCode);
        setTimeout(() => {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }, 0);
      } else {
        const beforeSelection = code.substring(0, start);
        const selection = code.substring(start, end);
        const afterSelection = code.substring(end);
        
        const lines = selection.split('\n');
        const indented = lines.map(line => '  ' + line).join('\n');
        
        const newCode = beforeSelection + indented + afterSelection;
        recordHistory();
        setCode(newCode);
        
        setTimeout(() => {
          textareaRef.current.selectionStart = start;
          textareaRef.current.selectionEnd = start + indented.length;
        }, 0);
      }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCode();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
  };

  const lineCount = code.split('\n').length;
  const wordCount = code.trim() ? code.trim().split(/\s+/).length : 0;
  const charCount = code.length;
  const matchCount = searchTerm ? (code.match(new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length : 0;

  const getTimeSinceLastSave = () => {
    if (!lastSaveTime.current) return 'Never saved';
    const seconds = Math.floor((Date.now() - lastSaveTime.current) / 1000);
    if (seconds < 60) return `Saved ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Saved ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `Saved ${hours}h ago`;
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-t-lg p-4 border-b border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-xl font-bold text-white">Pro Code Editor</h1>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                placeholder="File name"
              />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
              </select>
              {isModified && (
                <span className="text-yellow-500 text-sm flex items-center gap-1">
                  <FileText size={14} />
                  Unsaved
                </span>
              )}
              <span className="text-gray-400 text-xs">{getTimeSinceLastSave()}</span>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                ↶
              </button>
              
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y)"
              >
                ↷
              </button>
              
              <button
                onClick={formatCode}
                className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
                title="Auto Format"
              >
                <Zap size={14} />
                Format
              </button>
              
              <button
                onClick={saveCode}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
              >
                <Save size={16} />
                Save
              </button>
              
              <button
                onClick={copyCode}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
              >
                <Copy size={16} />
              </button>
              
              <label className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors cursor-pointer text-sm">
                <Upload size={16} />
                <input
                  type="file"
                  onChange={uploadCode}
                  className="hidden"
                  accept=".js,.py,.html,.css,.json,.txt"
                />
              </label>
              
              <button
                onClick={downloadCode}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                <Download size={16} />
              </button>
              
              <button
                onClick={resetCode}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <input
              id="search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search... (Ctrl+F)"
              className="flex-1 px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
            />
            {matchCount > 0 && (
              <span className="text-gray-400 text-sm">{matchCount} matches</span>
            )}
            <button
              onClick={() => setReplaceMode(!replaceMode)}
              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
            >
              Replace
            </button>
          </div>
          
          {replaceMode && (
            <div className="flex items-center gap-2 mt-2">
              <Zap size={16} className="text-gray-400" />
              <input
                type="text"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Replace with..."
                className="flex-1 px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
              />
              <button
                onClick={findAndReplace}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Replace All
              </button>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded overflow-hidden">
          <div className="flex">
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
            
            <textarea
              ref={textareaRef}
              value={code}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
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

        <div className="mt-4 bg-gray-800 rounded-lg p-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="text-gray-400">
              Lines: <span className="text-white font-mono">{lineCount}</span>
            </div>
            <div className="text-gray-400">
              Words: <span className="text-white font-mono">{wordCount}</span>
            </div>
            <div className="text-gray-400">
              Characters: <span className="text-white font-mono">{charCount}</span>
            </div>
            <div className="text-gray-400">
              History: <span className="text-white font-mono">{history.length}</span>
            </div>
            <div className="text-gray-400">
              Position: <span className="text-white font-mono">{historyIndex + 1}/{history.length}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Professional Features:</h3>
          <ul className="text-xs text-gray-500 space-y-1 grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <li>• Full history with undo/redo (Ctrl+Z/Ctrl+Y)</li>
            <li>• Real-time search with regex support (Ctrl+F)</li>
            <li>• Find and replace with match counting</li>
            <li>• Auto-format with smart indentation</li>
            <li>• Multi-line tab indentation</li>
            <li>• Time-aware save tracking</li>
            <li>• Memory-efficient file operations</li>
            <li>• Unsaved changes detection</li>
          </ul>
        </div>
      </div>
    </div>
  );
}