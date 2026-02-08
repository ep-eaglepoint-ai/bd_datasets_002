# Trajectory: Building a Reliable Event Booking Management System

This document records **how I personally designed and built** an event booking management system to replace a fragile, manual process. I applied **first-principles full-stack system design**, focusing on operational reliability and long-term correctness rather than over-engineering.

I followed a single invariant reasoning loop throughout the work:

**Audit → Contract → Design → Execute → Verify**

The objective was simple: **events must never disappear, conflict silently, or confuse staff**.

---

## 0. Domain Map (What I Needed to Understand First)

Before writing code, I mapped the domains involved. Event booking systems fail when the *event lifecycle* is misunderstood.

### Domains I Identified

1. **Event Domain Modeling**
   - What constitutes an event
   - Required vs optional attributes
   - Time span, recurrence, and ownership

2. **Resource Association**
   - Rooms, halls, or equipment as event attributes
   - Shared resources across events
   - Conflict potential

3. **Backend API Design**
   - CRUD semantics for events
   - Persistent storage guarantees
   - Validation and error reporting

4. **Frontend Application Design**
   - Event creation and editing flows
   - Calendar or list views
   - State-driven UI updates

5. **Data Persistence**
   - Durability across restarts
   - Consistency on update and deletion
   - Traceability of changes

6. **UX for Administrative Systems**
   - Clarity over cleverness
   - Predictable flows
   - Low cognitive load for staff

If I couldn’t clearly explain how an event moves through the system from creation to cancellation, I stopped and fixed the model.

---

## 1. Auditing the Problem Space (Why the Manual Event System Failed)

I started by observing real failures in the existing manual event scheduling process.

### Failures I Observed
- Overlapping events scheduled unintentionally
- Events forgotten or recorded inconsistently
- No authoritative event list
- No record of edits or cancellations
- Staff relying on memory or scattered notes

### First-Principle Conclusions
- Events are temporal — mistakes compound over time.
- If event data isn’t persisted, it doesn’t exist.
- Ambiguity in scheduling tools directly causes conflicts.

### Tasks I Extracted
- Define the full event lifecycle (create, update, cancel).
- Identify where conflicts occur.
- Identify which actions must require confirmation.

### References I Checked
- Why manual scheduling systems fail  
  https://www.nngroup.com/articles/human-error/
- CRUD as the foundation of operational systems  
  https://www.youtube.com/watch?v=QpAHW6p3t5c

---

## 2. Defining the System Contract (Before Writing Code)

I refused to implement anything until the system behavior was explicit.

### Core Entity I Defined
**Event**
- ID
- Title / Name
- Date
- Start time → end time
- Organizer
- Associated room(s) or resources
- Optional notes

### Backend API Contract

#### CRUD Endpoints
- `POST /api/events`
- `GET /api/events`
- `GET /api/events/{id}`
- `PUT /api/events/{id}`
- `DELETE /api/events/{id}`

### Behavioral Guarantees I Enforced
- Events persist across restarts.
- Invalid or conflicting events are rejected.
- Successful actions return confirmation.
- Deletions require explicit confirmation.

### Why This Step Mattered
This contract became:
- My backend implementation guide
- My frontend integration reference
- My correctness checklist

### References
- REST API design principles  
  https://restfulapi.net/
- HTTP methods and semantics  
  https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods

---

## 3. Designing the Data Model & Persistence Layer

### First-Principle Rule
Event data loss is unacceptable.

### Data Model Decisions
- Each event stored as a structured record
- Time range treated as a first-class attribute
- Resources linked, not duplicated
- Required vs optional fields explicit

### Persistence Options I Evaluated
- File-based storage (JSON, SQLite)
- Relational database (PostgreSQL, MySQL)

### Constraints I Enforced
- Create/update/delete operations are atomic.
- Updates cannot partially corrupt an event.
- Deletions are deliberate and irreversible except by re-creation.

### Reference
- Persistence trade-offs  
  https://martinfowler.com/articles/patterns-of-distributed-systems/persistence.html

---

## 4. Separating Responsibilities (Clean Full-Stack Architecture)

I intentionally separated concerns to avoid hidden coupling.

### Backend Responsibilities

1. **Request Handling**
   - Route event requests
   - Parse and validate input

2. **Business Logic**
   - Create, update, cancel events
   - Detect conflicts (time + resource)

3. **Persistence**
   - Read/write events safely
   - Handle missing or invalid IDs

4. **Error Reporting**
   - Structured error responses
   - Accurate HTTP status codes

### Frontend Responsibilities

1. **Event Visibility**
   - Clear list or calendar view
   - No hidden state

2. **Forms**
   - Create/edit event flows
   - Required fields clearly marked

3. **User Feedback**
   - Success confirmations
   - Validation errors
   - Cancel/delete confirmations

### References
- Separation of concerns  
  https://kentcdodds.com/blog/separation-of-concerns
- Clean architecture for CRUD systems  
  https://www.youtube.com/watch?v=7YcW25PHnAA

---

## 5. Input Validation & Conflict Semantics

Validation was treated as a **system invariant**, not a UI enhancement.

### Validation Rules I Enforced
- Required fields must exist.
- Start time must precede end time.
- Event duration must be valid.
- Conflicting events using the same resources are rejected.
- Validation enforced on both frontend and backend.

### Error Principles
- Errors are human-readable.
- Field-specific errors shown near inputs.
- Backend errors never leak internals.

### References
- OWASP input validation  
  https://owasp.org/www-community/Improper_Input_Validation
- Form validation UX  
  https://www.nngroup.com/articles/form-validation/

---

## 6. UI State & Event Interaction Flow

I designed the UI by enumerating **all meaningful states**, not just screens.

### States I Explicitly Supported

1. **Empty State**
   - No events scheduled
   - Clear call-to-action

2. **List / Calendar View**
   - All events visible
   - Time ordering obvious

3. **Create/Edit Form**
   - Inline validation
   - Clear cancel behavior

4. **Delete / Cancel Confirmation**
   - Explicit confirmation
   - No silent removal

### First-Principle UI Rules
- The UI must reflect event state honestly.
- Temporal data must be visually clear.
- Destructive actions must be intentional.

### References
- Empty state design  
  https://www.nngroup.com/articles/empty-state/
- Confirmation dialogs  
  https://uxdesign.cc/confirmation-dialogs-in-ux-design-5e2c6c8b4e7a

---

## 7. Implementing Full Event CRUD End-to-End

I validated the system by walking every event through its lifecycle.

### Create
- Validate input
- Check conflicts
- Persist event
- Show confirmation

### Read
- Fetch all events
- Render clearly
- Handle empty state

### Update
- Load event into form
- Re-validate
- Persist changes
- Confirm success

### Delete
- Require confirmation
- Remove event from storage
- Update UI immediately

### Reference
- End-to-end CRUD flow  
  https://www.youtube.com/watch?v=9o_6r9RkF9M

---

## 8. Testing Strategy (How I Tried to Break It)

I assumed the system would fail at the edges — and tested there first.

### Backend Tests
- CRUD correctness
- Time conflict detection
- Persistence across restarts

### Frontend Tests
- Form validation
- Calendar/list rendering
- Cancel/delete confirmation
- State consistency

### Why This Mattered
Event systems fail quietly — conflicts show up weeks later.

### References
- API testing  
  https://www.postman.com/api-platform/api-testing/
- UI testing  
  https://testing-library.com/docs/react-testing-library/intro/

---

## 9. Final Audit (Operational Readiness)

Before calling it done, I forced myself to answer:

- Do events persist reliably?
- Are conflicts prevented, not just displayed?
- Are errors clear and actionable?
- Are destructive actions protected?
- Can staff manage events without training?

### Quality Bar I Targeted
- Reliable persistence
- Conflict-free scheduling
- Clear UI
- Predictable behavior
- Low cognitive load
