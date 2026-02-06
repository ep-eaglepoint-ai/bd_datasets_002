import { useRef, useEffect, useCallback } from 'react';

/**
 * Secure JavaScript Sandbox Component
 * 
 * Uses iframe with sandbox attributes to isolate user code execution.
 * Prevents access to parent window, document, localStorage, and other browser APIs.
 * Intercepts console methods and restores them after execution.
 * Handles infinite loops with timeout protection.
 */
export function useSecureSandbox() {
  const iframeRef = useRef(null);
  const timeoutRef = useRef(null);

  // Create sandbox HTML content that will be loaded in iframe
  const createSandboxHTML = useCallback((userCode) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sandbox</title>
</head>
<body>
  <script>
    (function() {
      'use strict';
      
      // Backup original console methods
      const consoleBackup = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug
      };
      
      // Intercept console methods
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
          // Also call original to see in iframe console for debugging
          consoleBackup[method].apply(console, args);
        };
      };
      
      console.log = interceptConsole('log');
      console.error = interceptConsole('error');
      console.warn = interceptConsole('warn');
      console.info = interceptConsole('info');
      console.debug = interceptConsole('debug');
      
      // Remove dangerous globals
      delete window.eval;
      delete window.Function;
      
      // Block localStorage and sessionStorage
      // In sandboxed iframe, these may not exist, but we block them anyway
      const blockStorage = (name) => {
        try {
          // Try to delete first
          try {
            delete window[name];
          } catch (e) {}
          
          // Define property that throws on access
          Object.defineProperty(window, name, {
            get: function() { 
              throw new Error(name + ' access denied'); 
            },
            set: function() {
              throw new Error(name + ' access denied');
            },
            configurable: false,
            enumerable: false
          });
        } catch (e) {
          // If that fails, try creating a throwing object
          try {
            window[name] = {
              getItem: function() { throw new Error(name + ' access denied'); },
              setItem: function() { throw new Error(name + ' access denied'); },
              removeItem: function() { throw new Error(name + ' access denied'); },
              clear: function() { throw new Error(name + ' access denied'); }
            };
            Object.freeze(window[name]);
          } catch (e2) {}
        }
      };
      
      blockStorage('localStorage');
      blockStorage('sessionStorage');

      // Block network APIs
      const blockNetworkApi = (name) => {
        try {
          delete window[name];
        } catch (e) {}
        try {
          Object.defineProperty(window, name, {
            get: function() { throw new Error(name + ' access denied'); },
            set: function() { throw new Error(name + ' access denied'); },
            configurable: false,
            enumerable: false
          });
        } catch (e) {}
      };

      blockNetworkApi('fetch');
      blockNetworkApi('XMLHttpRequest');
      
      // Block document access to sensitive APIs
      if (document) {
        try {
          const originalOpen = document.open;
          document.open = function() {
            throw new Error('document.open() is not allowed');
          };
        } catch (e) {}
      }
      
      // Execute user code with timeout protection
      let executionResult = null;
      let executionError = null;
      let resultSent = false;

      function parseStackLocation(stack, lineOffset) {
        if (!stack) return null;
        const lines = String(stack).split('\n');
        const matchLine = lines.find(line => line.includes('sandbox_user_code.js'));
        if (!matchLine) return null;
        const match = matchLine.match(/sandbox_user_code\.js:(\d+):(\d+)/);
        if (!match) return null;
        const rawLine = parseInt(match[1], 10);
        const rawColumn = parseInt(match[2], 10);
        return {
          line: Math.max(1, rawLine - lineOffset),
          column: rawColumn
        };
      }

      function serializeError(err, lineOffset) {
        const message = err && err.message ? err.message : String(err);
        const stack = err && err.stack ? String(err.stack) : '';
        const location = parseStackLocation(stack, lineOffset);
        return {
          message,
          stack,
          line: location ? location.line : null,
          column: location ? location.column : null
        };
      }
      
      // Function to send result (only once)
      function sendResult() {
        if (resultSent) return;
        resultSent = true;
        clearTimeout(timeoutId);
        window.parent.postMessage({
          type: 'sandbox-result',
          logs: interceptedLogs,
          result: executionResult,
          error: executionError
        }, '*');
      }
      
      // Set up timeout protection
      const MAX_EXECUTION_TIME = 5000; // 5 seconds max
      const timeoutId = setTimeout(() => {
        if (!resultSent) {
          executionError = {
            message: 'Execution timeout: Possible infinite loop detected',
            stack: ''
          };
          sendResult();
        }
      }, MAX_EXECUTION_TIME);
      
      // Execute code immediately
      try {
        // Wrap user code in IIFE to prevent global pollution
        // Use script tag injection instead of eval/Function
        const script = document.createElement('script');
        const wrappedCode = `
          (function() {
            'use strict';
            let __returnValue;
            const __return = (value) => {
              __returnValue = value;
              return value;
            };
            try {
              /*__USER_CODE_START__*/
              ${userCode}
              /*__USER_CODE_END__*/
            } catch (err) {
              window.__sandboxError = serializeError(err, window.__sandboxLineOffset || 0);
              const errorMsg = err.message || err.name || String(err);
              console.error('Error:', errorMsg);
            }
            window.__sandboxResult = __returnValue;
          })();
          //# sourceURL=sandbox_user_code.js
        `;

        const userCodeStartLine = wrappedCode.split('\n').findIndex(line => line.includes('__USER_CODE_START__')) + 1;
        window.__sandboxLineOffset = Math.max(0, userCodeStartLine);
        
        script.textContent = wrappedCode;
        
        // Use error handler
        script.onerror = function(err) {
          if (!resultSent) {
            executionError = {
              message: 'Script execution error: ' + (err.message || 'Unknown error'),
              stack: ''
            };
            sendResult();
          }
        };
        
        // Append script - executes synchronously
        document.body.appendChild(script);
        
        // Check for errors and send result after script executes
        // Use requestAnimationFrame for faster execution (next frame)
        requestAnimationFrame(() => {
          // Use microtask to ensure script execution completes
          Promise.resolve().then(() => {
            if (window.__sandboxError) {
              executionError = window.__sandboxError;
              delete window.__sandboxError;
            }

            if (window.__sandboxResult !== undefined) {
              executionResult = window.__sandboxResult;
              delete window.__sandboxResult;
            }
            
            // Remove script after execution
            try {
              if (script.parentNode) {
                document.body.removeChild(script);
              }
            } catch (e) {}
            
            sendResult();
          });
        });
        
        // Also catch any unhandled errors that might occur
        window.addEventListener('error', function(event) {
          if (!resultSent) {
            executionError = serializeError(event.error || event.message || 'Unhandled error', window.__sandboxLineOffset || 0);
            sendResult();
          }
        }, { once: true });
        
      } catch (err) {
        if (!resultSent) {
          executionError = {
            message: err.message,
            stack: err.stack
          };
          sendResult();
        }
      }
    })();
  </script>
</body>
</html>
    `;
  }, []);

  const executeCode = useCallback((code, onResult) => {
    if (!iframeRef.current) {
      onResult({ error: 'Sandbox not initialized' });
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set up timeout for infinite loop protection
    timeoutRef.current = setTimeout(() => {
      onResult({
        error: 'Execution timeout: Code execution exceeded maximum time limit (5 seconds). Possible infinite loop detected.',
        logs: []
      });
    }, 5000);

    // Set up message listener FIRST, before loading iframe
    let messageHandler = null;
    let handlerRemoved = false;
    
    messageHandler = (event) => {
      // Verify message is from our iframe (basic security check)
      const iframeWindow = iframeRef.current ? iframeRef.current.contentWindow : null;
      if (event.source !== iframeWindow) {
        return;
      }
      if (event.data && event.data.type === 'sandbox-result') {
        if (!handlerRemoved) {
          handlerRemoved = true;
          clearTimeout(timeoutRef.current);
          window.removeEventListener('message', messageHandler);
          onResult({
            logs: event.data.logs || [],
            result: event.data.result,
            error: event.data.error || null
          });
        }
      }
    };

    window.addEventListener('message', messageHandler);

    // Load sandbox content
    try {
      const sandboxHTML = createSandboxHTML(code);
      const blob = new Blob([sandboxHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Set iframe src immediately - message handler is already set up
      if (iframeRef.current) {
        iframeRef.current.src = url;
        
        // Clean up blob URL after loading
        iframeRef.current.onload = () => {
          setTimeout(() => URL.revokeObjectURL(url), 100);
        };
      }
    } catch (err) {
      if (!handlerRemoved && messageHandler) {
        handlerRemoved = true;
        clearTimeout(timeoutRef.current);
        window.removeEventListener('message', messageHandler);
      }
      onResult({
        error: `Failed to initialize sandbox: ${err.message}`,
        logs: []
      });
    }
  }, [createSandboxHTML]);

  // Initialize iframe
  useEffect(() => {
    if (!iframeRef.current) {
      return;
    }

    // Set sandbox attributes for maximum isolation
    // Note: 'allow-scripts' only - this blocks localStorage, cookies, forms, etc.
    // localStorage is already blocked by browser in sandboxed iframe
    iframeRef.current.setAttribute('sandbox', 'allow-scripts');
    iframeRef.current.style.display = 'none';
  }, []);

  return { iframeRef, executeCode };
}
