# Trajectory: Maximizing Array Length via Optimal Subarray Consolidation

This document records **my actual reasoning process** for solving the array consolidation problem. I deliberately applied **first-principles thinking**, avoided pattern-matching shortcuts, and documented the external materials I used to validate or sharpen my understanding.

I kept a strict invariant throughout the work:

**Audit → Contract → Design → Execute → Verify**

This isn’t just how I explained the solution — it’s how I arrived at it.

---

## 0. Domain Map (What I Needed to Understand First)

Before touching code, I forced myself to map the domains involved. I’ve learned the hard way that missing even one domain leads to elegant but wrong solutions.

### Domains I Identified

1. **Algorithm Design**
   - Dynamic programming vs greedy
   - Optimal substructure recognition
   - State pruning

2. **Array & Subarray Semantics**
   - Prefix sums
   - Contiguous segment consolidation
   - Irreversible operations

3. **Monotonicity Constraints**
   - Enforcing non-decreasing order
   - Global vs local ordering effects

4. **Complexity Control**
   - Preventing exponential state explosion
   - Bounding transitions
   - Early termination

5. **Edge Case Behavior**
   - Already sorted arrays
   - Strictly decreasing arrays
   - Degenerate cases

Until I could explain *why* each domain mattered, I didn’t move forward.

---

## 1. Auditing the Problem Space (Why Naive Ideas Fail)

I started by asking: **why is this problem non-trivial?**

### What I Immediately Ruled Out
- Brute-force enumeration → exponential blowup.
- Simple greedy merges → locally valid, globally destructive.
- “Merge only when decreasing” heuristics → fails on lookahead.

### First-Principle Observations
- Every consolidation is **irreversible**.
- A bad early merge can permanently block future valid segments.
- The non-decreasing constraint applies to **final segments**, not original elements.
- The same consolidation patterns appear repeatedly.

At this point, it was obvious that **any correct solution must reuse subproblem results**.

### External References I Checked
- Why greedy fails in monotonic partitioning  
  https://www.youtube.com/watch?v=ARvQcqJ_-NY
- Dynamic programming intuition refresher  
  https://www.geeksforgeeks.org/dynamic-programming/

---

## 2. Defining the Problem Contract (No Ambiguity Allowed)

Before designing states, I locked down the **behavioral contract**. This became my correctness anchor.

### Input–Output Contract
- Input: integer array `nums`
- Output: maximum achievable final array length

### Hard Guarantees I Enforced
- Only contiguous subarrays may be consolidated.
- Consolidation replaces a subarray with its sum.
- Final array must be non-decreasing.
- Length must be **maximized**, not minimized.
- No consolidation unless it improves feasibility.

### Edge-Case Decisions
- Single element → return `1`
- Already non-decreasing → return `n`
- Strictly decreasing → must collapse to `1`

I treated this contract as:
- My DP state definition guide
- My test oracle
- My “did I cheat?” checklist

---

## 3. Identifying Optimal Substructure (The Turning Point)

This is where the solution clicked.

### First-Principle Reasoning
If I fix a consolidation starting at index `i`, **everything before `i` becomes irrelevant**. That means:

> An optimal solution for the full array must be composed of optimal solutions for suffixes.

That’s textbook optimal substructure — but I forced myself to justify it rather than assume it.

### State Insight
I defined:
- `dp[i]` = maximum achievable length starting at index `i`

The decision at `i` only depends on:
- Which subarray `[i..j]` I consolidate next
- Whether its sum preserves non-decreasing order

This immediately ruled out recursion without memoization.

### Reference I Used
- Overlapping subproblems explained cleanly  
  https://www.youtube.com/watch?v=oBt53YbR9Kk

---

## 4. Designing the State Transitions

I explicitly enumerated **every possible consolidation starting at `i`**.

### Transition Logic
For each `i`, I try all `j ≥ i`:
- Compute `sum(i..j)`
- Check monotonic validity
- Extend length as `1 + dp[j+1]`

Formally:
dp[i] = max over valid j of (1 + dp[j+1])


### Why Prefix Sums Were Mandatory
Without prefix sums, this becomes O(n³). With them, subarray sums are O(1), keeping transitions O(n²).

### Pruning Rules I Applied
- Stop extending `j` when sums become too large to maintain order.
- If no valid `j` exists, collapse the entire suffix.

### Resource I Consulted
- Prefix sum patterns  
  https://www.geeksforgeeks.org/prefix-sum-array-implementation-applications-competitive-programming/

---

## 5. Handling the Non-Decreasing Constraint (The Real Difficulty)

This wasn’t about comparing raw values — it was about **segment sums**.

### Strategy I Settled On
- Track the last consolidated value.
- Only allow next segments whose sum ≥ previous.
- Prefer **smaller valid sums**, because they preserve future flexibility.

### Key Insight
At the same index:
> A smaller ending sum dominates a larger one.

So I aggressively discarded dominated states early instead of carrying dead weight.

### Pattern Reference
- Monotonic DP patterns  
  https://leetcode.com/discuss/general-discussion/458695/dynamic-programming-patterns

---

## 6. Early Termination & Avoiding Over-Consolidation

I explicitly guarded against the instinct to “merge more just in case.”

### Principles I Followed
- Consolidation is only useful to fix monotonic violations.
- Over-merging reduces achievable length.
- Partial consolidation often beats full collapse.

### Early Exit Conditions
- No valid next segment exists.
- Remaining suffix must collapse to one element.

### Reference
- DP pruning strategies  
  https://cp-algorithms.com/dynamic_programming/intro-to-dp.html

---

## 7. Complexity Discipline (Non-Negotiable)

I enforced constraints deliberately — not as an afterthought.

### Final Guarantees
- **Time:** O(n²) worst case
- **Space:** O(n)

### Explicitly Rejected
- Recursive exponential searches
- Full state graphs
- Storing full consolidation paths

If a solution violated these, I discarded it immediately.

---

## 8. Testing Strategy (How I Tried to Break My Own Logic)

I didn’t trust the solution until it survived adversarial tests.

### Tests I Used

1. Already non-decreasing  
   `[1,2,3,4] → 4`

2. Strictly decreasing  
   `[4,3,2,1] → 1`

3. Partial consolidation beats full  
   `[5,1,2,3] → 3`

4. Repeated decision overlap  
   `[1,3,2,2,3]`

5. Single element  
   `[7] → 1`

### Reference
- DP test case design  
  https://www.geeksforgeeks.org/test-case-design-for-dynamic-programming/

---

## 9. Final Audit (Proof, Not Hope)

Before calling it done, I forced myself to answer:

- Did I consider every valid subarray?
- Did I reuse overlapping states?
- Is monotonicity enforced globally?
- Am I maximizing length, not minimizing merges?
- Do edge cases short-circuit correctly?

Only after all answers were “yes” did I stop.

