# Regent Alert System

## Problem Understanding

I needed to build an alert system for lab chemicals. The main challenge is tracking when reagents run low and notifying lab techs, but without spamming them with alerts every time someone uses a chemical.

## Initial Thoughts

First thing, I need to track stock levels. Simple object should work: `{ 'Ethanol': 10.0, 'Polymerase': 8.0 }`. Each chemical also needs its own threshold.

The tricky part is the debounce logic. If Ethanol drops below 5L, I should alert once, but if someone uses more Ethanol 10 seconds later, I shouldn't alert again. Need to track when I last alerted for each chemical.

## Implementation Approach

### Step 1: Set up the project structure

- Created `package.json` with Jest since we're testing in JavaScript
- Added ES module support because modern JS is cleaner
- Fixed the jest config - it was looking for `*.test_after.js` but the file is just `test_after.js`

### Step 2: Build the AlertDispatcher class

Started with the core data structures:

```javascript
this.stock = {}; // chemical name -> current quantity
this.thresholds = {}; // chemical name -> alert threshold
this.lastAlerted = {}; // chemical name -> timestamp
this.queue = []; // pending alerts
```

The `notifyUsage` method is where the logic happens:

1. Decrease stock by the amount used
2. Clamp to 0 if it goes negative (validation requirement)
3. Check if below threshold
4. If yes, check if we alerted in the last 60 seconds
5. If not, add to queue and update timestamp

For `getQueue()`, I used the spread operator to copy the array, then cleared it. This "consume" pattern makes sense - you read alerts and they're gone.

### Step 3: Write the tests

The requirements gave me two specific test scenarios:

1. **Debounce test**: Use Ethanol 3 times quickly. Should only get 1 alert.
   - Initialize with 10L, threshold at 5L
   - Use 2L three times (drops to 4L after first use)
   - First use triggers alert, next two don't

2. **Multi-chemical test**: Two different chemicals both drop below threshold.
   - Both should appear in the queue
   - Used `find()` to verify both are present

Added two more tests for completeness:

- Queue clearing behavior
- Stock validation (can't go negative)

## Challenges & Solutions

**Challenge**: How to implement the 60-second debounce?
**Solution**: Store `Date.now()` timestamp when alerting, check delta on next trigger. Simple and doesn't need timers or intervals.

**Challenge**: Should stock be allowed to go negative?
**Solution**: Requirements say no. Added `if (this.stock[name] < 0) this.stock[name] = 0;`

**Challenge**: What if someone calls `getQueue()` twice?
**Solution**: Second call returns empty array since we clear after first call. This is the expected behavior.

## Testing

Ran `npm test` locally first - all 4 tests passed.

Then tested Docker commands:

- `docker compose run --rm --build test` ✅
- `docker compose run --rm --build evaluation` ✅

Evaluation generated a clean report with all tests passing.

## Final Thoughts

The implementation is pretty straightforward. The key insight was realizing that debouncing is just timestamp comparison, no need for complex timer management. Keeping everything in-memory with simple objects makes the code easy to understand and test.
