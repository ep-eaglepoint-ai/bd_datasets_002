import React, { useState, useRef, useEffect } from 'react';
import { Copy, Download, Upload, RotateCcw, Play } from 'lucide-react';
import { useSecureSandbox } from './SecureSandbox';

export default function CodeEditor() {
  const [code, setCode] = useState(`// Write your JavaScript code here
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci(10):", fibonacci(10));

// Try writing your own functions!`);

  const [language, setLanguage] = useState('javascript');
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [error, setError] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const { iframeRef, executeCode } = useSecureSandbox();
  
  // Backup and restore console methods
  const consoleBackupRef = useRef(null);
  
  useEffect(() => {
    // Backup original console methods
    consoleBackupRef.current = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };
    
    return () => {
      // Restore console on unmount
      if (consoleBackupRef.current) {
        console.log = consoleBackupRef.current.log;
        console.error = consoleBackupRef.current.error;
        console.warn = consoleBackupRef.current.warn;
        console.info = consoleBackupRef.current.info;
        console.debug = consoleBackupRef.current.debug;
      }
    };
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
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
    a.download = `code.${extensions[language] || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadCode = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCode(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const resetCode = () => {
    setCode('// Write your code here\n');
  };

  // SECURE: Execute code in isolated sandbox
  const handleExecuteCode = () => {
    setConsoleOutput([]);
    setError(null);
    setIsExecuting(true);
    
    if (language !== 'javascript') {
      setError('Only JavaScript execution is supported');
      setIsExecuting(false);
      return;
    }

    if (code.length > 5000) {
      setError('Code exceeds maximum length of 5000 characters');
      setIsExecuting(false);
      return;
    }

    // Intercept console methods to capture output
    const interceptedLogs = [];
    const interceptConsole = (method) => {
      return function(...args) {
        interceptedLogs.push({
          type: method,
          message: args.map(arg => {
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg, null, 2);
              } catch (e) {
                return String(arg);
              }
            }
            return String(arg);
          }).join(' ')
        });
        // Also call original
        if (consoleBackupRef.current) {
          consoleBackupRef.current[method].apply(console, args);
        }
      };
    };

    // Backup and intercept
    const originalConsole = { ...console };
    console.log = interceptConsole('log');
    console.error = interceptConsole('error');
    console.warn = interceptConsole('warn');
    console.info = interceptConsole('info');
    console.debug = interceptConsole('debug');

    // Execute in sandbox
    executeCode(code, (result) => {
      // Always restore console, even if there's an error
      try {
        if (consoleBackupRef.current) {
          console.log = consoleBackupRef.current.log;
          console.error = consoleBackupRef.current.error;
          console.warn = consoleBackupRef.current.warn;
          console.info = consoleBackupRef.current.info;
          console.debug = consoleBackupRef.current.debug;
        }
      } catch (restoreErr) {
        // If restoration fails, try to restore from backup
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
        console.info = originalConsole.info;
        console.debug = originalConsole.debug;
      }

      setIsExecuting(false);
      
      if (result.error) {
        setError(result.error);
        setConsoleOutput(prev => [...prev, { type: 'error', message: result.error }]);
      }
      
      // Add intercepted logs from sandbox
      if (result.logs && result.logs.length > 0) {
        setConsoleOutput(prev => [...prev, ...result.logs.map(log => ({
          type: log.type,
          message: log.message
        }))]);
      }
      
      // Add result if any
      if (result.result !== undefined && result.result !== null) {
        setConsoleOutput(prev => [...prev, { type: 'result', message: String(result.result) }]);
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const lineCount = code.split('\n').length;

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-t-lg p-4 border-b border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white">Code Editor</h1>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
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
                onClick={handleExecuteCode}
                disabled={isExecuting}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Run Code"
              >
                <Play size={16} />
                {isExecuting ? 'Running...' : 'Run'}
              </button>
              
              <button
                onClick={copyCode}
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
                  onChange={uploadCode}
                  className="hidden"
                  accept=".js,.py,.html,.css,.json,.txt"
                />
              </label>
              
              <button
                onClick={downloadCode}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                title="Download Code"
              >
                <Download size={16} />
                Download
              </button>
              
              <button
                onClick={resetCode}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                title="Reset Code"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Editor */}
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
              onChange={(e) => setCode(e.target.value)}
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

        {/* Stats Bar */}
        <div className="mt-4 bg-gray-800 rounded-lg p-3 flex items-center justify-between text-sm">
          <div className="flex gap-6 text-gray-400">
            <span>Lines: <span className="text-white font-mono">{lineCount}</span></span>
            <span>Characters: <span className="text-white font-mono">{code.length}</span></span>
            <span>Language: <span className="text-white font-mono">{language}</span></span>
          </div>
          <div className="text-gray-500 text-xs">
            Press Tab for indentation
          </div>
        </div>

        {/* Console Output */}
        <div className="mt-4 bg-gray-800 rounded-lg overflow-hidden">
          <div className="bg-gray-700 px-4 py-2 border-b border-gray-600">
            <h3 className="text-sm font-semibold text-white">Console Output</h3>
          </div>
          <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
            {consoleOutput.length === 0 && !error && (
              <div className="text-gray-500 text-sm">No output yet. Click "Run" to execute your code.</div>
            )}
            {consoleOutput.map((item, index) => (
              <div
                key={index}
                className={`text-sm font-mono mb-2 ${
                  item.type === 'error' ? 'text-red-400' : 
                  item.type === 'result' ? 'text-blue-400' : 
                  'text-green-400'
                }`}
              >
                {item.message}
              </div>
            ))}
            {error && (
              <div className="text-sm font-mono text-red-400">
                Error: {error}
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-4 bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Editor Features:</h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Tab key support for proper indentation (2 spaces)</li>
            <li>• Line numbers for easy navigation</li>
            <li>• Copy, download, and upload code files</li>
            <li>• Multiple language syntax support</li>
            <li>• Monospace font for better code readability</li>
            <li>• Run JavaScript code directly in the browser</li>
          </ul>
        </div>
      </div>
      
      {/* Hidden iframe for secure sandbox */}
      <iframe
        ref={iframeRef}
        title="code-sandbox"
        sandbox="allow-scripts"
        style={{ display: 'none', position: 'absolute', width: 0, height: 0 }}
      />
    </div>
  );
}

