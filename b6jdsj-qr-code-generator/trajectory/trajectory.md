# Trajectory: Building Robust Full-Stack QR Code Generator

This trajectory applies a **first-principles, constraint-driven design process** to building a minimal yet robust full-stack QR code generator. The structure follows the invariant pattern:

**Audit → Contract → Design → Execute → Verify**

The objective is not feature richness, but **predictability, correctness, and auditability** under explicit constraints.

---

## 0. Domain Map (What You Must Actually Understand)

Before implementation, enumerate all involved domains. Missing even one leads to brittle systems.

### Domains

1. **Frontend Application Design**
   - Single-page application flow
   - Controlled inputs
   - Explicit UI states

2. **React Architecture**
   - Functional components only
   - React hooks (`useState`, `useEffect`)
   - Deterministic state transitions

3. **UI & Styling Constraints**
   - Tailwind utility classes only
   - Responsive layout
   - No custom CSS or UI frameworks

4. **Backend API Design**
   - RESTful endpoint design
   - Stateless request handling
   - No persistence layer

5. **Input Validation & Error Handling**
   - Strict runtime validation
   - Clear, structured error responses
   - Proper HTTP status codes

6. **Networking & Integration**
   - API calls
   - CORS configuration
   - Graceful failure handling

---

## 1. Audit the Problem Space (Failure & Constraint Analysis)

**Goal:** Identify how minimal full-stack applications fail when constraints are ignored.

### First-Principle Truths
- Simplicity does not eliminate failure modes.
- Most frontend bugs are state bugs.
- Most backend bugs are contract violations.

### Common Failure Modes
- Accepting empty or oversized input
- UI stuck in loading state
- Backend accepting invalid payloads
- Network failures not reflected in UI
- Unstructured error responses

### Tasks
- Enumerate all failure cases.
- Define the expected UI and API behavior for each failure.
- Ensure no failure results in ambiguous state.

### Resources
- SPA failure patterns  
  https://www.youtube.com/watch?v=RAJD4KpX8LA
- Common REST API mistakes  
  https://www.youtube.com/watch?v=Fbf_ua2t6v4

---

## 2. Define the Application Contract (Before Writing Code)

This step replaces guesswork with **explicit guarantees**.

### API Contract

#### Request
```json
POST /api/generate
{
  "text": "string"
}

#### Response
```json
{
  "qrCode": "base64-encoded-image",
  "timestamp": "ISO-8601"
}
```

#### Error Response
```json
{
  "error": "Human-readable message",
  "code": "ERROR_TYPE"
}
```

# Contract Guarantees
- Input must be a string
- Input must be non-empty
- Input length ≤ 500 characters
- Backend is fully stateless
- No retries on failure
- No extra features beyond QR generation

# Purpose of the Contract
- Single source of truth
- Validation reference
- Testing oracle
- Review checklist

# Resources
- **REST API fundamentals**
  [https://restfulapi.net/](https://restfulapi.net/)
- **HTTP status codes**
  [https://developer.mozilla.org/en-US/docs/Web/HTTP/Status](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

# 3. Define the Data & State Model

## Frontend State Model
The UI must be representable by explicit state variables:
- `text`
- `charCount`
- `isLoading`
- `qrCode`
- `error`

### First Principles
- UI is a pure function of state.
- Every visible UI condition must map to a state.
- No implicit or derived UI behavior.

## Backend Data Model
- No database
- No filesystem
- No caching
- Data exists only for the lifetime of the request

### Resources
- **Thinking in React**
  [https://react.dev/learn/thinking-in-react](https://react.dev/learn/thinking-in-react)

# 4. Separate Responsibilities (Clean Architecture)

## Frontend Responsibilities
### Input Handling
- Controlled input field
- Real-time character count
- Client-side validation

### UI State Rendering
- Idle
- Loading
- Success
- Error

### API Communication
- Single POST request
- No retries
- Explicit error handling

## Backend Responsibilities
### Request Validation
- Reject non-string input
- Reject empty strings
- Reject strings > 500 characters

### QR Code Generation
- In-memory only
- No side effects

### Response Formatting
- Structured JSON
- Correct HTTP status codes

### Resources
- **Separation of concerns in frontend**
  [https://kentcdodds.com/blog/separation-of-concerns](https://kentcdodds.com/blog/separation-of-concerns)
- **Clean backend handlers**
  [https://www.youtube.com/watch?v=7YcW25PHnAA](https://www.youtube.com/watch?v=7YcW25PHnAA)

# 5. Input Validation & Error Semantics

## Frontend Validation
- Disable "Generate QR" for invalid input
- Display character count at all times
- Prevent submission of invalid values

## Backend Validation
Reject requests with:
- Missing `text`
- Non-string values
- Empty strings
- Strings longer than 500 characters

**Return:**
- HTTP 400
- Structured error body

## Error Principles
- Human-readable messages
- Stable error codes
- No internal details exposed

### Resources
- **OWASP Input Validation**
  [https://owasp.org/www-community/Improper_Input_Validation](https://owasp.org/www-community/Improper_Input_Validation)
- **UX error message guidelines**
  [https://www.nngroup.com/articles/error-message-guidelines/](https://www.nngroup.com/articles/error-message-guidelines/)

# 6. UI State Flow & Loading Semantics

## First Principles
- Loading is a state.
- UI must never be ambiguous.

## Required UI States
- **Idle**
  - Input enabled
  - No QR displayed
- **Loading**
  - Button disabled
  - Loading indicator visible
- **Success**
  - QR code displayed immediately
  - Timestamp available if needed
- **Error**
  - Error message displayed
  - UI returns to usable state

## Constraints
- No retries
- No stale QR codes after failure
- No hidden transitions

### Resources
- **Managing async UI state**
  [https://www.youtube.com/watch?v=YJPSR9d_EQU8](https://www.youtube.com/watch?v=YJPSR9d_EQU8)

# 7. Implement the Backend Endpoint (Stateless & Minimal)

## Endpoint
`POST /api/generate`

## Responsibilities
- Validate input
- Generate QR code in memory
- Encode image as base64
- Attach ISO-8601 timestamp

## CORS Requirements
- Explicit allowed origins
- Explicit allowed methods
- Explicit allowed headers

## Constraints
- No database
- No filesystem
- No background jobs

### Resources
- **CORS explained**
  [https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- **Stateless backend principles**
  [https://12factor.net/processes](https://12factor.net/processes)

# 8. Build a Minimal Verification Strategy

## Frontend Verification
- Character count accuracy
- Button disabled on invalid input
- Loading state visibility
- Error message rendering

## Backend Verification
- HTTP 400 on invalid input
- Correct JSON structure
- Proper CORS headers
- No side effects

## Why This Matters
Minimal systems degrade quickly without explicit verification.

### Resources
- **Testing React state**
  [https://testing-library.com/docs/react-testing-library/intro/](https://testing-library.com/docs/react-testing-library/intro/)
- **API testing basics**
  [https://www.postman.com/api-platform/api-testing/](https://www.postman.com/api-platform/api-testing/)

# 9. Final Audit: Robustness Under Constraints

## Final Review Questions
- Is every UI state explicit?
- Is every error deterministic?
- Is the API contract enforced on both sides?
- Are there any hidden features?
- Can the entire system be understood in one pass?

## Target Quality Bar
- Predictable behavior
- Minimal abstraction
- Easy to audit
- Safe to extend without breaking constraints