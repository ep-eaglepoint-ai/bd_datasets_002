# Trajectory:  Tax Calculator (Ionic + React + TSX)

This document captures **how I approached and built** a  mobile tax calculator. The intent was never to model tax law exhaustively — it was to deliver **fast, transparent estimates** that users can understand immediately on a phone screen.

I kept the scope intentionally tight and followed the same reasoning loop throughout:

**Audit → Contract → Design → Execute → Verify**

The constraint was clarity. Anything that reduced trust or speed was cut.

---

## 1. Breaking Down the Problem (What Actually Needed Solving)

I started by stripping the problem down to what users actually struggle with.

### Observations
- People want quick estimates, not legal-grade precision.
- Overly complex tax tools feel opaque and untrustworthy.
- If the result isn’t instantly understandable, users disengage.

### What Users Actually Need
- A few simple inputs
- Immediate feedback
- Clear financial outputs
- A UI that works naturally on mobile

Anything outside this list was intentionally excluded.

---

## 2. Input–Output Contract (Locking Down Behavior)

Before touching UI or code structure, I defined exactly what goes in and what comes out.

### Inputs
- Annual income
- Total deductions
- Tax mode:
  - Flat tax (single percentage)
  - Progressive tax (brackets)

### Outputs
- Taxable income
- Total tax owed
- Net income after tax
- Effective tax rate

### Guarantees I Enforced
- Calculations update immediately on input change.
- Outputs always reflect the current inputs.
- No hidden state, no delayed computation, no “calculate” button.

This contract became my guardrail — if something violated it, it didn’t ship.

---

## 3. Tax Calculation Logic (Rules, Not UI Tricks)

I treated tax calculation as **pure business logic**, isolated from rendering concerns.

### Taxable Income
- Calculated as income minus deductions
- Clamped to zero to avoid negative tax bases

### Flat Tax
- Apply a single percentage to taxable income
- Straight multiplication, no side effects

### Progressive Tax
- Apply brackets sequentially
- Accumulate tax per bracket
- Stop once the taxable income is exhausted

### Derived Values
- Net income = income − total tax
- Effective tax rate = total tax ÷ income (guarded for zero income)

All calculations were deterministic and testable without a UI.

---

## 4. Architecture & Separation of Concerns

I deliberately separated **what calculates** from **what renders**.

### Business Logic Layer
- Pure functions only
- No React, no Ionic imports
- Configurable tax brackets
- Easy to test in isolation

### UI Layer (Ionic + React)
- Collects inputs
- Displays derived outputs
- No embedded math or branching tax logic

**Reasoning:**  
Tax rules change. UI shouldn’t have to.

---

## 5. State & Recalculation Strategy

I kept state minimal and derived everything else.

### State Variables
- Income
- Deductions
- Tax mode
- Flat rate or tax bracket configuration

### Strategy I Used
- Controlled inputs with `useState`
- All calculations derived during render
- No syncing of computed values into state

This eliminated an entire class of bugs around stale or inconsistent results.

---

## 6. UI Implementation (Ionic)

I designed the UI around **mobile clarity**, not density.

### Components I Used
- `IonInput` for numeric fields
- `IonSelect` for tax mode selection
- `IonCard` for summarized results
- `IonList` for grouped outputs

### UI Rules I Followed
- Mobile-first layout
- Clear labels and units
- Immediate visual feedback on change
- No scrolling to “find” the result

If a user changed a number and didn’t instantly see the impact, it was a failure.

---

## 7. Progressive Tax Configuration

I treated tax brackets as data, not logic.

### Bracket Model
- Each bracket defined by:
  - Lower bound
  - Upper bound (or infinity)
  - Rate

### Design Goals
- Fully data-driven
- Easy to extend or modify
- Predictable behavior across inputs

This made the progressive logic readable instead of clever.

---

## 8. Verification & Constraints

I validated behavior against the contract, not assumptions.

### What I Verified
- Correct results for flat tax
- Correct accumulation for progressive tax
- Instant recalculation on every input change
- Proper handling of edge cases:
  - Zero income
  - Deductions exceeding income

### Constraints I Accepted
- Runs entirely in the browser
- Uses `ionic serve`
- No backend
- No persistence
- No user accounts

Those constraints simplified the system — and that was intentional.

---

## Core Invariant

**Audit → Contract → Design → Execute → Verify**

The tools change.  
The reasoning loop doesn’t.