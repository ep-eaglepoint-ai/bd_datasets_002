# Trajectory (Thinking Process)

## 1. Audit the Original Code / Problem

I reviewed the problem statement and the original codebase to identify gaps, missing features, structural issues, or inefficiencies.

**Before:**  
The original implementation (`repository_before/`) used `eval()` directly in the global scope to execute user-provided JavaScript code. This approach had critical security and stability failures:

- **Security Vulnerabilities**: Direct `eval()` execution exposed the entire global scope, allowing malicious code to:
  - Access and modify `window`, `document`, `localStorage`, `sessionStorage`
  - Access parent window through `parent.window` or `top.window`
  - Pollute global objects and prototypes
  - Execute arbitrary code with full browser API access

- **Stability Issues**: 
  - No protection against infinite loops, causing UI freezes
  - No timeout mechanism to prevent long-running code from blocking the application
  - Console methods were not properly intercepted or restored after errors
  - No isolation between user code and the parent application

- **Testing Gaps**: The original code had no test infrastructure, making it impossible to verify security or functionality.

**After / Implemented Solution:**  
The secure implementation (`repository_after/`) addresses all security and stability concerns:

- **Secure Isolation**: Uses iframe with `sandbox="allow-scripts"` attribute to create a completely isolated execution environment. User code cannot access:
  - Parent window or document
  - `localStorage` or `sessionStorage`
  - Global objects in the parent scope
  - Browser APIs that could compromise security

- **Safe Code Execution**: Instead of `eval()` or `new Function()`, uses script tag injection within the isolated iframe, allowing the browser's native JavaScript engine to execute code safely.

- **Console Interception**: Properly intercepts all console methods (`log`, `error`, `warn`, `info`, `debug`), captures output, and always restores original console methods even if user code throws errors.

- **Infinite Loop Protection**: Implements a 5-second timeout mechanism that safely terminates long-running code and prevents UI freezes.

- **Comprehensive Testing**: Full test suite with Jest and Playwright covering security isolation, infinite loop protection, console interception, and safe code execution.

---

## 2. Define the Contract (Correctness + Constraints)

The implementation must satisfy strict constraints:

**Inputs:**
- User-provided JavaScript code (up to 5000 characters)
- Code execution requests via "Run" button

**Outputs:**
- Captured console output displayed in UI
- Error messages for security violations or execution failures
- Execution results (if any)

**Structure Constraints:**
- Only one of each required folder: `tests/`, `evaluation/`, `repository_before/`, `repository_after/`
- All tests must be in `tests/` directory
- Meta-tests must be local-only (not in Docker)
- Exactly 3 Docker commands: `test-before`, `test-after`, `evaluation`

**Explicit Exclusions:**
- ❌ No `eval()` or `new Function()` on untrusted code
- ❌ No Web Workers
- ❌ No external sandbox libraries (vm2, isolated-vm, etc.)
- ❌ No access to parent window/document
- ❌ No global state mutation
- ❌ No Python dependencies (pure Node.js/JavaScript)

**Security Requirements:**
- Complete isolation from parent application
- Block access to `window`, `document`, `localStorage`, `sessionStorage`
- Prevent infinite loops from freezing UI
- Always restore console state after execution

---

## 3. Design & Implementation

**Design Choices:**

1. **Iframe Sandboxing**: The core security mechanism uses an HTML iframe with the `sandbox="allow-scripts"` attribute. This creates a restricted environment where:
   - Scripts can run but cannot access parent window
   - No form submission, navigation, or top-level navigation
   - Complete isolation from parent document

2. **Script Tag Injection**: Instead of `eval()`, user code is wrapped in an IIFE (Immediately Invoked Function Expression) and injected via a `<script>` tag. This:
   - Maintains strict mode execution
   - Prevents global scope pollution
   - Uses browser-native execution (no eval/Function)

3. **PostMessage Communication**: The iframe communicates with the parent via `postMessage` API, allowing:
   - Safe data transfer without direct object access
   - Console log capture
   - Error reporting
   - Result transmission

4. **Timeout Protection**: A dual-layer timeout system:
   - Parent-level timeout (5 seconds) that triggers if iframe doesn't respond
   - Iframe-level timeout that sends error message if execution exceeds limit

5. **Console Interception**: Console methods are intercepted at the iframe level:
   - Original methods are backed up
   - Intercepted methods capture output and send via postMessage
   - Original methods are always restored, even on errors

**Implementation Structure:**

```
repository_after/
├── src/
│   ├── App.js              # Main editor component
│   └── SecureSandbox.js    # Secure sandbox hook with iframe isolation
├── package.json            # React dependencies
└── public/                 # Static assets
```

**Key Implementation Details:**

- `SecureSandbox.js`: Custom React hook that manages iframe lifecycle, creates sandbox HTML with security restrictions, and handles postMessage communication
- `App.js`: Main component that uses the secure sandbox hook, manages console backup/restoration, and displays results
- Test infrastructure: Jest + Playwright for browser-based integration tests

**Clean Code Practices:**
- Modular design with separation of concerns
- React hooks for state management
- Error handling at every level
- Comprehensive comments explaining security measures
- Type-safe patterns (even without TypeScript)

---

## 4. Testing Review

**Test Coverage:**

1. **Security Isolation Tests** (`tests/sandbox.test.js`):
   - `localStorage` access blocked
   - `window` object access blocked
   - Parent window access blocked
   - Verifies that malicious code cannot affect parent application

2. **Infinite Loop Protection**:
   - Tests that infinite loops timeout after 5 seconds
   - Verifies UI remains responsive after timeout
   - Ensures error message is displayed

3. **Console Interception**:
   - Verifies `console.log` output is captured
   - Tests console restoration after errors
   - Ensures subsequent executions work correctly

4. **Safe Execution**:
   - Tests simple arithmetic operations
   - Tests function definitions and calls
   - Verifies legitimate code executes correctly

5. **Code Length Limit**:
   - Tests rejection of code exceeding 5000 characters

6. **Meta-Tests** (`tests/meta.test.js`):
   - Verifies no `eval()` or `new Function()` usage
   - Checks iframe usage for isolation
   - Verifies console interception implementation
   - Checks timeout protection
   - Ensures no Web Workers or external libraries

**Test Design Practices:**
- Uses Playwright for real browser testing (not mocks)
- Tests run against actual built React application
- Environment variable (`TEST_REPO`) allows testing both before/after implementations
- Optimized timeouts for faster execution
- Proper cleanup of browser instances

**Test Infrastructure:**
- `test-runner.js`: Builds React app, serves it, and runs tests
- Jest configuration with proper timeouts
- Docker integration for reproducible testing

---

## 5. Result / Measurable Improvements

**Solution Correctly Implements All Task Requirements:**
✅ Secure isolation using iframe sandboxing  
✅ No `eval()` or `new Function()` usage  
✅ Console interception and restoration  
✅ Infinite loop protection with timeout  
✅ Code length validation (5000 characters)  
✅ Complete test coverage  
✅ Docker-based testing infrastructure  

**Tests Confirm Correctness:**
- All security tests pass for `repository_after`
- All security tests fail for `repository_before` (as expected)
- Meta-tests verify implementation quality
- Evaluation system generates comprehensive reports

**Good Practices Maintained:**
- **Clean Code**: Modular design, clear separation of concerns, comprehensive comments
- **Modularity**: Reusable `useSecureSandbox` hook, separate test files
- **Correct Validation**: Input validation, error handling, timeout protection
- **Security First**: Defense in depth, multiple layers of protection
- **Maintainability**: Well-documented code, clear test structure

**Performance:**
- Fast test execution (optimized timeouts)
- Efficient Docker builds (layer caching)
- Responsive UI even during code execution

---

## 6. Source Links

1. **MDN Web Docs - Iframe Sandbox Attribute**
   https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
   - Official documentation on iframe sandbox security features
   - Explains sandbox restrictions and security implications

2. **OWASP - Code Injection Prevention**
   https://cheatsheetseries.owasp.org/cheatsheets/Code_Injection_Prevention_Cheat_Sheet.html
   - Best practices for preventing code injection attacks
   - Security guidelines for executing untrusted code

3. **MDN Web Docs - postMessage API**
   https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
   - Secure cross-origin communication between iframes
   - Safe data transfer patterns

4. **React Documentation - Custom Hooks**
   https://react.dev/reference/react/custom-hooks
   - Best practices for creating reusable React hooks
   - State management patterns

5. **Playwright Documentation - Browser Automation**
   https://playwright.dev/docs/intro
   - End-to-end testing with real browsers
   - Best practices for browser-based testing
