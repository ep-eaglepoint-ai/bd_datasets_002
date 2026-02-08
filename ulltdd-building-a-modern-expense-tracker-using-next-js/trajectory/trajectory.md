# Trajectory: Mobuilding a modern expense tracker using Next.js

This document records **how I approached building** a modern expense tracker using Next.js. The focus was not novelty — it was reliability, clarity, and correctness in everyday usage.

I treated this as a practical system-building exercise and followed a consistent reasoning loop throughout:

**Audit → Contract → Design → Execute → Verify**

The outcome I cared about was a tool that behaves predictably, scales with usage, and doesn’t collapse under small UI or state changes.

---

## 1. Breaking Down the Actual Problem

I started by clarifying what the system truly needed to do — not what similar apps *usually* do.

### What Users Actually Need
- A simple way to record expenses
- The ability to edit or remove mistakes
- Accurate totals
- Filtering without losing data
- A UI that works on both desktop and mobile

### Capabilities the System Must Support
- Create, read, update, delete (CRUD) expenses
- Compute totals correctly at all times
- Filter expenses by category and date
- Remain usable across screen sizes

Anything outside this scope was intentionally excluded.

---

## 2. Tooling & Framework Grounding

Before writing application logic, I made sure I was grounded in the tools I was relying on.

### Frontend Stack
- React for component and state modeling
- Next.js for application structure and routing

### References I Used
- React fundamentals  
  https://react.dev/learn
- Next.js routing and app structure  
  https://nextjs.org/docs

This step prevented me from fighting the framework later.

---

## 3. Data Modeling & Invariants

I treated the expense model as the backbone of the system. If this was wrong, everything else would be fragile.

### Expense Model
Each expense consists of:
- Unique ID
- Description
- Amount
- Category
- Date

### Rules I Enforced
- Required fields must always be present
- Amount must be numeric
- Dates must be valid
- Invalid input must never mutate state

Once an expense exists in state, it must already be valid — no cleanup later.

### References
- JavaScript Date handling  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
- Schema validation concepts  
  https://zod.dev/

---

## 4. State Management & Derived Data

I kept stored state minimal and derived everything else.

### Stored State
- List of expenses
- Active filters (category, date, or range)

### Derived Data
- Filtered expense list
- Total expense amount

### Rule I Followed
If something can be derived, it does not belong in state.

This avoided synchronization bugs and kept updates predictable.

### Reference
- Choosing state structure in React  
  https://react.dev/learn/choosing-the-state-structure

---

## 5. CRUD Implementation Strategy

I implemented CRUD end-to-end and validated each operation independently.

### Create
- Controlled form inputs
- Validation before submission
- Append to state immutably

### Read
- Render expenses as a list or table
- Graceful empty-state handling

### Update
- Pre-fill form with existing data
- Apply immutable state updates

### Delete
- Explicit user action
- Immediate UI update after removal

### Reference
- Updating arrays in React state  
  https://react.dev/learn/updating-arrays-in-state

---

## 6. Filtering & Aggregation Logic

I treated filtering and aggregation as pure operations on data.

### Filtering
- Category-based filtering
- Date or date-range filtering
- Filters composed without mutating source data

### Aggregation
- Total computed from filtered results
- Recomputed automatically on every relevant change

### References
- Array filtering  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
- Array reduction  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce

---

## 7. Responsive UI Design

I designed the UI assuming it would be used on small screens first.

### Requirements I Enforced
- Mobile-first layout
- Readable presentation (table on desktop, stacked cards on mobile)
- Clear feedback for empty and error states

### References
- Tailwind responsive utilities  
  https://tailwindcss.com/docs/responsive-design
- Client components in Next.js  
  https://nextjs.org/docs/app/building-your-application/rendering/client-components

---

## 8. Validation & Error Handling

I treated validation as a system invariant, not a UX enhancement.

### Validation Rules
- Required fields enforced
- Amount must be numeric
- Date must be valid

### Error Feedback
- Inline validation errors
- Invalid submissions blocked entirely

### References
- React Hook Form  
  https://react-hook-form.com/
- Form validation fundamentals  
  https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation

---

## 9. Verification Checklist

Before considering the system complete, I verified:

- CRUD operations behave consistently
- Totals update after every mutation
- Filters never mutate source data
- Empty states render correctly
- Layout adapts cleanly to screen size

Only after all of these held true did I stop iterating.