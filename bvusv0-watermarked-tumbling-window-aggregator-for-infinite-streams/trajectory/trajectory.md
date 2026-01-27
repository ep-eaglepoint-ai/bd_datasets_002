Audit the Original Implementation (Identify Scaling & Correctness Risks):

I audited the original stream aggregator implementation. It kept per-window lists in memory without bounds, emitted windows based on arrival order, and scanned all open windows to find expired ones — all of which would not scale for high-throughput or long-event-time skew.

Learn about watermarks and event-time processing: https://www.youtube.com/watch?v=BTAGOHeZcDo

Practical guide to window semantics and late data handling: https://nightlies.apache.org/flink/flink-docs-release-1.15/docs/dev/datastream/operators/windows/

Define a Performance & Correctness Contract First

I defined explicit requirements: keep memory bounded, emit each tumbling window exactly once, tolerate out-of-order events up to allowed lateness, and make per-event work O(1) with no full-state scans.

Rework the In-Memory State for Efficiency

I replaced global lists with a keyed map from window start → compact aggregate (sum/count) to avoid storing individual events. Track only the latest event-time watermark so eviction is constant-time.

Use Hash-Based Window Assignment + Incremental Aggregation

Window assignment uses hash-based lookup: `window_start = (timestamp // WINDOW_SIZE) * WINDOW_SIZE` for O(1) updates. Aggregate incrementally rather than recalculating on every event.

Implement Watermark-Driven Emission

I maintain a single `max_event_timestamp` watermark to deterministically decide which windows are complete. Emit windows in increasing order when their `end + allowed_lateness <= watermark`.

Eliminate Full-State Scans

When advancing the watermark, iterate only over windows older than the cutoff timestamp. Remove emitted windows immediately from memory to keep state bounded.

Handle Late and Malformed Events

Drop events arriving later than `allowed_lateness` to prevent indefinite state growth. Validate JSON early and treat malformed records as separate error cases.

Result: O(1) Per-Event Processing + Bounded Memory

The solution consistently uses O(1) per-event processing, bounded memory (old windows evicted on watermark progress), deterministic emission in chronological order, and explicit late-data handling. All 17 tests pass, validating correctness for out-of-order streams, window boundaries, and memory cleanup.
