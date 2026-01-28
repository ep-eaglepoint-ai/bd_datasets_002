Audit the Original Implementation (Identify Scaling & Correctness Risks):

I audited the original stream aggregator implementation. It kept per-window lists in memory without bounds, emitted windows based on arrival order, and scanned all open windows to find expired ones — all of which would not scale for high-throughput or long-event-time skew.

Learn about watermarks and event-time processing: https://www.youtube.com/watch?v=BTAGOHeZcDo

Practical guide to window semantics and late data handling: https://nightlies.apache.org/flink/flink-docs-release-1.15/docs/dev/datastream/operators/windows/

Define a Performance & Correctness Contract First

I defined explicit requirements: keep memory bounded, emit each tumbling window exactly once, tolerate out-of-order events up to allowed lateness, and achieve amortized O(1) per-event processing.

Rework the In-Memory State for Efficiency

I replaced unbounded lists with a keyed map from window start → compact aggregate (sum/count). This avoids storing individual event values and reduces memory from O(N events) to O(W windows).

Use Hash-Based Window Assignment + Incremental Aggregation

Window assignment uses hash-based lookup: `window_start = (timestamp // WINDOW_SIZE) * WINDOW_SIZE` for O(1) updates. Aggregate incrementally (sum += value, count += 1) rather than storing all values.

Implement Watermark-Driven Emission

I maintain a single `max_event_timestamp` watermark. Windows are emitted when `window_end + allowed_lateness <= watermark`, ensuring no late events can arrive after emission.

Use Min-Heap for O(1) Amortized Emission

Instead of scanning all windows, use a min-heap ordered by window completion time. When watermark advances, pop completed windows from heap in O(log W) per window. Since each window is emitted exactly once, this gives amortized O(1) per event.

Handle Late and Malformed Events

Drop events arriving later than `allowed_lateness` to prevent indefinite state growth. Validate JSON early and skip malformed records.

Result: Amortized O(1) Per-Event + Bounded Memory

The solution achieves O(W) memory where W is active windows, amortized O(1) per event (O(log W) heap operations amortized over all events), and correct event-time semantics. All tests pass, validating correctness for out-of-order streams, proper late-data handling with allowed_lateness, and memory cleanup.
