import React, { useState, useRef, useEffect } from 'react';
import { useSecureSandbox } from './SecureSandbox';
import Header from './components/Header';
import Editor from './components/Editor';
import StatsBar from './components/StatsBar';
import ConsoleOutput from './components/ConsoleOutput';
import Tips from './components/Tips';
import SecureSandboxIframe from './components/SecureSandboxIframe';

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
        <Header
          language={language}
          onLanguageChange={setLanguage}
          onExecute={handleExecuteCode}
          onCopy={copyCode}
          onDownload={downloadCode}
          onUpload={uploadCode}
          onReset={resetCode}
          isExecuting={isExecuting}
        />

        <Editor
          code={code}
          onCodeChange={setCode}
          onKeyDown={handleKeyDown}
          lineCount={lineCount}
        />

        <StatsBar
          lineCount={lineCount}
          characterCount={code.length}
          language={language}
        />

        <ConsoleOutput
          consoleOutput={consoleOutput}
          error={error}
        />

        <Tips />
      </div>
      
      <SecureSandboxIframe iframeRef={iframeRef} />
    </div>
  );
}
