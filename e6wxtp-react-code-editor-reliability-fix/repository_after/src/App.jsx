import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Download, Upload, RotateCcw, Save, FileText, Search, Zap } from 'lucide-react';

export default function CodeEditor() {
  const DEFAULT_CODE = `// Write your JavaScript code here
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci(10):", fibonacci(10));`.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState('javascript');
  const [fileName, setFileName] = useState('untitled');

  const [searchTerm, setSearchTerm] = useState('');
  const [replaceMode, setReplaceMode] = useState(false);
  const [replaceTerm, setReplaceTerm] = useState('');

  const [history, setHistory] = useState({
    stack: [DEFAULT_CODE],
    index: 0
  });

  const [savedVersion, setSavedVersion] = useState(DEFAULT_CODE);
  const [isModified, setIsModified] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [regexError, setRegexError] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const textareaRef = useRef(null);
  const lastSaveTime = useRef(null);
  const historyTimeout = useRef(null);

  useEffect(() => {
    const normalize = (s) => (s || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    setIsModified(normalize(savedVersion) !== normalize(code));
  }, [code, savedVersion]);

  const updateHistory = useCallback((newCode) => {
    if (historyTimeout.current) {
      clearTimeout(historyTimeout.current);
      historyTimeout.current = null;
    }

    setHistory(prev => {
      if (prev.stack[prev.index] === newCode) return prev;

      const newStack = prev.stack.slice(0, prev.index + 1);
      return {
        stack: [...newStack, newCode],
        index: newStack.length
      };
    });
  }, []);

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);

    if (historyTimeout.current) {
      clearTimeout(historyTimeout.current);
    }

    historyTimeout.current = setTimeout(() => {
      updateHistory(newCode);
      historyTimeout.current = null;
    }, 300);
  };

  const undo = () => {
    // Calculate next state synchronously based on current closure values
    let newStack = [...history.stack];
    let newIndex = history.index;
    let newCode = code;

    // If there's a pending debounce, we treat the current 'code' as a new entry
    // that needs to be effectively "saved" before we step back.
    if (historyTimeout.current) {
      clearTimeout(historyTimeout.current);
      historyTimeout.current = null;

      // Flush pending changes to stack
      if (newStack[newIndex] !== code) {
        newStack = newStack.slice(0, newIndex + 1);
        newStack.push(code);
        // After pushing pending, the "tip" is at newStack.length - 1.
        // The "undo" action means we want to go back to previous committed state.
        // Which is the state at 'newIndex' (before push).
        // So newIndex doesn't move forward to tip, it stays at committed.
        // Effectively: Tip = Current Dirty. Commited = Previous.
        // We want to show Commit.
      }
      
      // If we flushed, newCode should be the one at newIndex (committed)
      newCode = newStack[newIndex];
    } else {
      // Standard undo
      if (newIndex > 0) {
        newIndex--;
        newCode = newStack[newIndex];
      }
    }

    setHistory({ stack: newStack, index: newIndex });
    setCode(newCode);
  };

  const redo = () => {
    let newStack = [...history.stack];
    let newIndex = history.index;
    let newCode = code;

    // If pending changes exist, we flush them.
    // This effectively puts us at the "Future" (End of stack).
    // So distinct Redo is not possible immediately, but state is made consistent.
    if (historyTimeout.current) {
      clearTimeout(historyTimeout.current);
      historyTimeout.current = null;

      if (newStack[newIndex] !== code) {
        newStack = newStack.slice(0, newIndex + 1);
        newStack.push(code);
        newIndex = newStack.length - 1; // Move to the new tip
      }
      // newCode is already 'code', so no visual change, just committed to history.
    } else {
      // Standard redo
      if (newIndex < newStack.length - 1) {
        newIndex++;
        newCode = newStack[newIndex];
      }
    }

    setHistory({ stack: newStack, index: newIndex });
    setCode(newCode);
  };

  const findAndReplace = () => {
    if (!searchTerm) return;

    // Clear any pending debounce
    if (historyTimeout.current) {
      clearTimeout(historyTimeout.current);
      historyTimeout.current = null;
    }

    try {
      setRegexError('');
      let regex;
      if (useRegex) {
        regex = new RegExp(searchTerm, 'g');
      } else {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, 'g');
      }

      const newCode = code.replace(regex, replaceTerm);
      if (newCode !== code) {
        // Add both current state and new state in a single setHistory call
        // to avoid React batching issues
        setHistory(prev => {
          const newStack = prev.stack.slice(0, prev.index + 1);
          // Add current code if different from latest
          if (prev.stack[prev.index] !== code) {
            newStack.push(code);
          }
          // Add the new replaced code
          newStack.push(newCode);
          return {
            stack: newStack,
            index: newStack.length - 1
          };
        });
        setCode(newCode);
      }
    } catch (e) {
      setRegexError(e.message);
    }
  };

  const downloadCode = () => {
    const extensions = {
      javascript: 'js',
      python: 'py',
      html: 'html',
      css: 'css',
      json: 'json'
    };

    let downloadName = fileName;
    const langExt = extensions[language] || 'txt';

    if (!downloadName.toLowerCase().endsWith('.' + langExt)) {
      const nameParts = fileName.split('.');
      if (nameParts.length > 1) {
        if (nameParts[nameParts.length - 1] !== langExt) {
          downloadName = `${fileName}.${langExt}`;
        }
      } else {
        downloadName = `${fileName}.${langExt}`;
      }
    }

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const uploadCode = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Capture current code before async FileReader runs
      const currentCode = code;

      // Clear any pending debounce
      if (historyTimeout.current) {
        clearTimeout(historyTimeout.current);
        historyTimeout.current = null;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        if (typeof content !== 'string') return;

        // Add both current state and uploaded content in a single setHistory call
        // to avoid React batching issues
        setHistory(prev => {
          const newStack = prev.stack.slice(0, prev.index + 1);
          // Add current code if different from latest
          if (prev.stack[prev.index] !== currentCode) {
            newStack.push(currentCode);
          }
          // Add the uploaded content
          newStack.push(content);
          return {
            stack: newStack,
            index: newStack.length - 1
          };
        });
        setCode(content);

        const nameParts = file.name.split('.');
        const ext = nameParts.length > 1 ? nameParts.pop()?.toLowerCase() : '';
        const name = nameParts.join('.');
        setFileName(name || file.name);

        const langMap = {
          js: 'javascript',
          javascript: 'javascript',
          py: 'python',
          python: 'python',
          html: 'html',
          css: 'css',
          json: 'json',
          txt: 'text'
        };
        if (ext && langMap[ext]) {
          setLanguage(langMap[ext]);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  const saveCode = () => {
    if (historyTimeout.current) {
      updateHistory(code);
    }
    setSavedVersion(code);
    lastSaveTime.current = Date.now();
  };

  const resetCode = () => {
    // Clear any pending debounce
    if (historyTimeout.current) {
      clearTimeout(historyTimeout.current);
      historyTimeout.current = null;
    }

    const defaultCode = '// Write your code here\n';
    setCode(defaultCode);
    setHistory({ stack: [defaultCode], index: 0 });
    setFileName('untitled');
    setSavedVersion(defaultCode);
    setSearchTerm('');
    setReplaceTerm('');
    setRegexError('');
    setUseRegex(false);
    setReplaceMode(false);
    setLanguage('javascript');
    setMatchCount(0);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const formatCode = () => {
    // Clear any pending debounce
    if (historyTimeout.current) {
      clearTimeout(historyTimeout.current);
      historyTimeout.current = null;
    }

    const normalizedCode = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedCode.split('\n');
    let indentLevel = 0;

    const formatted = lines.map(line => {
      const trimmed = line.trim();
      let currentIndent = indentLevel;

      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        currentIndent = Math.max(0, indentLevel - 1);
      }

      const indented = '  '.repeat(currentIndent) + trimmed;

      const openBraces = (trimmed.split('{').length - 1);
      const closeBraces = (trimmed.split('}').length - 1);
      const openBrackets = (trimmed.split('[').length - 1);
      const closeBrackets = (trimmed.split(']').length - 1);
      const openParens = (trimmed.split('(').length - 1);
      const closeParens = (trimmed.split(')').length - 1);

      indentLevel += (openBraces - closeBraces) + (openBrackets - closeBrackets) + (openParens - closeParens);
      indentLevel = Math.max(0, indentLevel);

      return indented;
    }).join('\n');

    if (formatted !== code) {
      // Add both current state and formatted state in a single setHistory call
      // to avoid React batching issues
      setHistory(prev => {
        const newStack = prev.stack.slice(0, prev.index + 1);
        // Add current code if different from latest
        if (prev.stack[prev.index] !== code) {
          newStack.push(code);
        }
        // Add the formatted code
        newStack.push(formatted);
        return {
          stack: newStack,
          index: newStack.length - 1
        };
      });
      setCode(formatted);
    }
  };

  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  const saveCodeRef = useRef(saveCode);

  useEffect(() => {
    undoRef.current = undo;
    redoRef.current = redo;
    saveCodeRef.current = saveCode;
  });

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCodeRef.current();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redoRef.current();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const currentCode = code;

      if (start === end) {
        const newCode = currentCode.substring(0, start) + '  ' + currentCode.substring(end);
        setCode(newCode);
        updateHistory(newCode);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
          }
        }, 0);
      } else {
        const allLines = currentCode.split('\n');
        const getLineFromIndex = (idx) => {
          return currentCode.substring(0, idx).split('\n').length - 1;
        };

        const startLine = getLineFromIndex(start);
        let endLine = getLineFromIndex(end);

        const isEndAtLineStart = currentCode[end - 1] === '\n';
        if (isEndAtLineStart && endLine > startLine) {
          endLine--;
        }

        const newLines = allLines.map((line, idx) => {
          if (idx >= startLine && idx <= endLine) {
            return '  ' + line;
          }
          return line;
        });

        const newCode = newLines.join('\n');
        setCode(newCode);
        updateHistory(newCode);

        setTimeout(() => {
          if (textareaRef.current) {
            const addedCharsStart = 2;
            const totalAdded = (endLine - startLine + 1) * 2;
            textareaRef.current.selectionStart = start + addedCharsStart;
            textareaRef.current.selectionEnd = end + totalAdded;
          }
        }, 0);
      }
    }
  };

  const lineCount = code.split('\n').length;
  const wordCount = code.trim() ? code.trim().split(/\s+/).length : 0;
  const charCount = code.length;

  useEffect(() => {
    if (!searchTerm) {
      setMatchCount(0);
      setRegexError('');
      return;
    }
    try {
      let regex;
      if (useRegex) {
        regex = new RegExp(searchTerm, 'g');
      } else {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, 'g');
      }
      const matches = code.match(regex);
      setMatchCount(matches ? matches.length : 0);
      setRegexError('');
    } catch (e) {
      setMatchCount(0);
      setRegexError(e.message);
    }
  }, [searchTerm, code, useRegex]);

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
                disabled={history.index <= 0}
                className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                ↶
              </button>

              <button
                onClick={redo}
                disabled={history.index >= history.stack.length - 1}
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
            <div className="flex-1 relative">
              <input
                id="search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={useRegex ? "Regex Search... (e.g. ^function)" : "Search... (Ctrl+F)"}
                className={`w-full px-3 py-1 bg-gray-700 text-white rounded border ${regexError ? 'border-red-500' : 'border-gray-600'} focus:outline-none focus:border-blue-500 text-sm`}
              />
              {regexError && (
                <div className="absolute left-0 -bottom-5 text-[10px] text-red-500 truncate w-full">
                  {regexError}
                </div>
              )}
            </div>
            <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700"
              />
              .*
            </label>
            {matchCount > 0 && (
              <span className="text-blue-400 text-sm font-mono">{matchCount} matches</span>
            )}
            <button
              onClick={() => setReplaceMode(!replaceMode)}
              className={`px-3 py-1 rounded transition-colors text-sm ${replaceMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
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
                disabled={!!regexError}
                className={`px-3 py-1 rounded transition-colors text-sm ${regexError
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
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
              History: <span className="text-white font-mono">{history.stack.length}</span>
            </div>
            <div className="text-gray-400">
              Position: <span className="text-white font-mono">{history.index + 1}/{history.stack.length}</span>
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