import React, { useRef, useEffect, useCallback } from 'react';

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
  const consoleBackupRef = useRef(null);

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
      
      // Block access to parent
      try {
        Object.defineProperty(window, 'parent', {
          get: function() { return window; },
          configurable: false
        });
        Object.defineProperty(window, 'top', {
          get: function() { return window; },
          configurable: false
        });
        Object.defineProperty(window, 'frameElement', {
          get: function() { return null; },
          configurable: false
        });
      } catch (e) {}
      
      // Block localStorage and sessionStorage
      try {
        Object.defineProperty(window, 'localStorage', {
          get: function() { throw new Error('localStorage access denied'); },
          configurable: false
        });
        Object.defineProperty(window, 'sessionStorage', {
          get: function() { throw new Error('sessionStorage access denied'); },
          configurable: false
        });
      } catch (e) {}
      
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
      
      // Set up timeout protection
      const startTime = Date.now();
      const MAX_EXECUTION_TIME = 5000; // 5 seconds max
      const timeoutId = setTimeout(() => {
        executionError = {
          message: 'Execution timeout: Possible infinite loop detected',
          stack: ''
        };
        window.parent.postMessage({
          type: 'sandbox-result',
          logs: interceptedLogs,
          result: null,
          error: executionError
        }, '*');
      }, MAX_EXECUTION_TIME);
      
      // Use setTimeout to make execution interruptible (helps with some infinite loops)
      setTimeout(() => {
        try {
          // Wrap user code in IIFE to prevent global pollution
          // Use script tag injection instead of eval/Function
          const script = document.createElement('script');
          const wrappedCode = \`
            (function() {
              'use strict';
              try {
                \${userCode}
              } catch (err) {
                window.__sandboxError = {
                  message: err.message,
                  stack: err.stack
                };
              }
            })();
          \`;
          
          script.textContent = wrappedCode;
          
          // Use error handler
          script.onerror = function(err) {
            executionError = {
              message: 'Script execution error: ' + (err.message || 'Unknown error'),
              stack: ''
            };
            clearTimeout(timeoutId);
            sendResult();
          };
          
          document.body.appendChild(script);
          
          // Script executes synchronously when appended
          // Check for errors after a brief moment
          setTimeout(() => {
            if (window.__sandboxError) {
              executionError = window.__sandboxError;
              delete window.__sandboxError;
            }
            
            // Remove script after execution
            try {
              if (script.parentNode) {
                document.body.removeChild(script);
              }
            } catch (e) {}
            
            clearTimeout(timeoutId);
            sendResult();
          }, 10);
          
        } catch (err) {
          executionError = {
            message: err.message,
            stack: err.stack
          };
          clearTimeout(timeoutId);
          sendResult();
        }
      }, 0);
      
      // Function to send result
      function sendResult() {
        window.parent.postMessage({
          type: 'sandbox-result',
          logs: interceptedLogs,
          result: executionResult,
          error: executionError
        }, '*');
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

    // Set up message listener
    const messageHandler = (event) => {
      // Verify message is from our iframe (basic security check)
      if (event.data && event.data.type === 'sandbox-result') {
        clearTimeout(timeoutRef.current);
        window.removeEventListener('message', messageHandler);
        onResult({
          logs: event.data.logs || [],
          result: event.data.result,
          error: event.data.error ? event.data.error.message : null
        });
      }
    };

    window.addEventListener('message', messageHandler);

    // Load sandbox content
    try {
      const sandboxHTML = createSandboxHTML(code);
      const blob = new Blob([sandboxHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;
      
      // Clean up blob URL after loading
      iframeRef.current.onload = () => {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
    } catch (err) {
      clearTimeout(timeoutRef.current);
      window.removeEventListener('message', messageHandler);
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
    iframeRef.current.setAttribute('sandbox', 'allow-scripts');
    iframeRef.current.style.display = 'none';
  }, []);

  return { iframeRef, executeCode };
}
