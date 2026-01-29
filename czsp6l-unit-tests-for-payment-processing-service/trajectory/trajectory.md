# Trajectory: Payment Processing Service Optimization

## 1. Problem Statement

The original `compute_customer_report` function processes large newline-delimited JSON (NDJSON) event streams to generate per-customer analytics. The implementation had three critical performance issues:

1. **Eager parsing**: All lines were parsed upfront into `Event` dataclass objects before any filtering occurred, loading the entire dataset into memory
2. **Excessive memory usage**: Events were stored in per-customer lists before aggregation, doubling memory consumption
3. **Per-customer sorting**: Each customer's events were sorted by timestamp (`sorted(evs, key=lambda x: x.ts)`), resulting in O(n log n) complexity per customer

With millions of events and hundreds of thousands of customers, these design choices caused the solution to become slow and memory-intensive under realistic production loads.

## 2. Requirements

I identified these requirements that the solution must meet:

1. Optimize runtime and memory usage for large inputs
2. Preserve the exact returned structure and field meanings
3. Preserve all filtering logic (invalid IDs, timestamp validation, allowed event types)
4. Preserve FX conversion semantics (missing currency rate defaults to 1.0)
5. Preserve tie-breaking for `top_event_type` (highest count, then lexicographically smallest)
6. Preserve rounding behavior (6 decimals)
7. Keep shard deterministic for the same customer_id
8. Keep function signature unchanged
9. Handle malformed NDJSON lines safely

## 3. Constraints

I noted these constraints for the implementation:

1. No changes to output for valid inputs
2. Standard library only (no external dependencies)
3. Do not load full dataset into memory if avoidable
4. Do not sort full event lists per customer unless strictly required
5. Handle millions of events and hundreds of thousands of customers without O(N²) behavior
6. Time conversion must remain UTC-based
7. No global state (thread-safe)
8. Keep per-customer `by_day` output stable and correct

## 4. Research and Resources

I researched these key concepts for the optimization:

- **Streaming JSON parsing**: Processing JSON incrementally instead of loading all at once
- **In-place aggregation**: Computing metrics during single-pass iteration instead of storing raw data for post-processing
- **Incremental tracking**: Maintaining running values (sums, counts, maxima) instead of storing and sorting all data
- **Python generator patterns**: Using iterables efficiently for memory-constrained processing

## 5. Method Selection and Rationale

### 5.1 Eliminating the Event Dataclass

I decided to remove the dataclass entirely and process raw JSON objects directly. The original solution used a dataclass `Event` to represent each parsed line, which required importing `dataclasses` and storing all fields including `metadata` that was never used in the report. I realized that I only needed specific fields from each event, and storing them in an intermediate structure added overhead without benefit.

### 5.2 Switching to Streaming Processing

I changed from parsing all lines upfront to processing one line at a time inside the main loop. The original `_parse_ndjson` function consumed the entire iterable and returned a list, loading all events into memory at once. I chose streaming because each line can be validated and filtered independently, aggregated metrics can be updated incrementally, and memory usage becomes O(1) per event instead of O(N) for the entire dataset.

### 5.3 Removing Per-Customer Sorting

I eliminated the per-customer sorting step. The original code sorted each customer's events by timestamp to find the `latest_event_ts` and to process events chronologically. I realized sorting was not required because `latest_event_ts` can be tracked incrementally by comparing each new event's timestamp with the current maximum, and the per-event metrics (spend, type counts, by_day) are commutative and associative—they produce the same result regardless of processing order. This decision removed the O(n log n) sorting cost per customer.

### 5.4 On-the-Fly Aggregation

I implemented on-the-fly aggregation instead of storing full event lists per customer. Rather than using `by_customer: Dict[str, List[Event]]`, I aggregate metrics directly in a single-pass. For each customer, I maintain running counters and sums: `total_events`, `total_spend_usd`, `ticket_sum` and `ticket_count` for checkout tickets, `by_day` for daily breakdowns, `type_counter` for event type frequencies, and `latest_event_ts` for the maximum timestamp. This works because all required output values can be computed from these aggregations without needing the original event data.

### 5.5 Error Handling for Malformed Lines

I wrapped JSON parsing and type conversions in try/except blocks to skip malformed lines gracefully. The original code would crash on invalid JSON or type coercion errors. I chose this approach to ensure the entire run completes even with corrupted input, which satisfies the constraint that invalid lines must not crash the entire run.

## 6. Solution Implementation

### 6.1 Single-Pass Streaming Architecture

I implemented a loop that processes one line at a time:

```python
totals: Dict[str, Dict[str, Any]] = {}

for line in ndjson_lines:
    if not line:
        continue
    line = line.strip()
    if not line:
        continue

    try:
        obj = json.loads(line)
    except Exception:
        continue
```

I filter empty lines first and catch JSON parsing errors without crashing the entire run.

### 6.2 Incremental Field Extraction and Validation

I extract and validate each field immediately as I process it:

```python
event_id = str(obj.get("event_id", ""))
customer_id = str(obj.get("customer_id", ""))
if not customer_id or not event_id:
    continue

try:
    ts = int(obj.get("ts", 0))
except Exception:
    continue
if ts <= 0 or ts > now_ts:
    continue

event_type = str(obj.get("event_type", ""))
if allowed_event_types is not None and event_type not in allowed_event_types:
    continue
```

I eliminated the need for a separate filtering pass by validating fields as I extract them.

### 6.3 Per-Customer Aggregation Structure

I created a nested dict to store running aggregations for each customer:

```python
cust = totals.get(customer_id)
if cust is None:
    cust = {
        "total_events": 0,
        "total_spend_usd": 0.0,
        "ticket_sum": 0.0,
        "ticket_count": 0,
        "by_day": {},
        "type_counter": Counter(),
        "latest_event_ts": 0,
    }
    totals[customer_id] = cust
```

I initialize this structure lazily when I first encounter a customer.

### 6.4 Incremental Metric Updates

I update each metric immediately when its conditions are met:

```python
cust["total_events"] += 1
cust["total_spend_usd"] += usd

if event_type == "checkout" and usd > 0:
    cust["ticket_sum"] += usd
    cust["ticket_count"] += 1

day_row = cust["by_day"].get(day)
if day_row is None:
    cust["by_day"][day] = {"events": 1, "spend_usd": usd}
else:
    day_row["events"] += 1
    day_row["spend_usd"] += usd

cust["type_counter"][event_type] += 1

if ts > cust["latest_event_ts"]:
    cust["latest_event_ts"] = ts
```

I avoid the need to revisit events by updating all metrics during the single pass.

### 6.5 Final Report Generation

After processing all lines, I transform the aggregated data into the required output format:

```python
for customer_id, cust in totals.items():
    total_events = cust["total_events"]
    total_spend = cust["total_spend_usd"]
    ticket_count = cust["ticket_count"]
    avg_ticket = (cust["ticket_sum"] / ticket_count) if ticket_count else 0.0

    type_counter = cust["type_counter"]
    top_event_type = None
    if type_counter:
        best_count = max(type_counter.values())
        candidates = [k for k, v in type_counter.items() if v == best_count]
        top_event_type = sorted(candidates)[0]

    report[customer_id] = {
        "total_events": total_events,
        "total_spend_usd": round(total_spend, 6),
        "avg_ticket_usd": round(avg_ticket, 6),
        "active_days": len(cust["by_day"]),
        "top_event_type": top_event_type,
        "latest_event_ts": cust["latest_event_ts"],
        "by_day": cust["by_day"],
        "shard": _stable_bucket(customer_id),
    }
```

I apply the same tie-breaking logic I found in the original code.

## 7. Handling Requirements, Constraints, and Edge Cases

### 7.1 Memory Efficiency

I avoided loading the full dataset by processing lines one at a time. Memory usage is O(C) where C is the number of unique customers, not O(N) where N is the number of events. The original implementation stored all events twice (in the parsed list and in per-customer lists), while my optimized version only stores aggregated metrics.

### 7.2 Runtime Efficiency

The original solution had O(N log N) complexity due to per-customer sorting. My solution is O(N) for the main loop, with O(C) for the final report generation. For large datasets, this eliminates a significant bottleneck.

### 7.3 Filtering Preservation

I preserved all original filtering conditions:
- Empty `event_id` or `customer_id` is rejected
- Timestamp must be positive and not in the future
- Event type must be in `allowed_event_types` if specified

### 7.4 FX Conversion

I call the `_fx_convert` function for each event with the provided rates dictionary. Missing currency rates default to 1.0 as required.

### 7.5 Tie-Breaking for top_event_type

I use the same algorithm: find the maximum count, collect all event types with that count, then pick the lexicographically smallest. This produces identical results to the original.

### 7.6 Rounding

I apply `round(total_spend, 6)` and `round(avg_ticket, 6)` exactly as in the original.

### 7.7 Shard Determinism

I call the `_stable_bucket` function once per customer during report generation, producing the same shard value as the original.

### 7.8 Malformed Input Handling

I catch JSON parsing errors and type conversion errors and skip those lines. The loop continues processing subsequent lines instead of crashing. This satisfies the constraint that invalid lines must not crash the entire run.

### 7.9 Edge Cases Handled

I ensured these edge cases are handled correctly:

1. **Empty input**: Returns empty dict (same as original)
2. **Single event**: Correctly computes all metrics
3. **Multiple events on same day**: `by_day` accumulates correctly
4. **No checkout events**: `avg_ticket_usd` is 0.0 (same as original)
5. **Missing currency in rates**: Defaults to 1.0 (same as original)
6. **Malformed JSON lines**: Skipped gracefully (improved over original which would crash)
