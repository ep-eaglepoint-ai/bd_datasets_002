// Malicious code snippets that should be blocked
export const maliciousSnippets = [
  {
    name: "localStorage_access",
    code: "localStorage.setItem('test', 'hacked');",
    shouldFail: true,
    failureReason: "localStorage access should be blocked"
  },
  {
    name: "sessionStorage_access",
    code: "sessionStorage.setItem('test', 'hacked');",
    shouldFail: true,
    failureReason: "sessionStorage access should be blocked"
  },
  {
    name: "window_access",
    code: "window.location = 'http://evil.com';",
    shouldFail: true,
    failureReason: "window.location modification should be blocked"
  },
  {
    name: "document_access",
    code: "document.cookie = 'hacked=1';",
    shouldFail: true,
    failureReason: "document.cookie access should be blocked"
  },
  {
    name: "parent_window_access",
    code: "parent.window.location = 'http://evil.com';",
    shouldFail: true,
    failureReason: "parent window access should be blocked"
  },
  {
    name: "eval_usage",
    code: "eval('alert(1)');",
    shouldFail: true,
    failureReason: "eval should not be accessible"
  },
  {
    name: "function_constructor",
    code: "new Function('return alert(1)')();",
    shouldFail: true,
    failureReason: "Function constructor should not be accessible"
  }
];
