## Research

**Event-time processing fundamentals:**
- [Streaming 101 - The world beyond batch](https://www.oreilly.com/radar/the-world-beyond-batch-streaming-101/)
- [Apache Flink - Event Time and Watermarks](https://nightlies.apache.org/flink/flink-docs-master/docs/concepts/time/)
- [Tyler Akidau - Streaming Systems (YouTube)](https://www.youtube.com/watch?v=BTAGOHeZcDo)

**Window semantics and allowed lateness:**
- [Apache Flink - Windows Documentation](https://nightlies.apache.org/flink/flink-docs-release-1.15/docs/dev/datastream/operators/windows/)
- [Google Cloud - Watermarks and Late Data](https://cloud.google.com/dataflow/docs/concepts/streaming-pipelines#watermarks-and-late-data)

## Implementation

**Define requirements:** Memory-bounded state, exactly-once window emission, configurable allowed lateness, amortized O(1) processing.

**State optimization:** Replace lists with `defaultdict(lambda: {'sum': 0.0, 'count': 0})` for O(W) memory instead of O(N).

**Window assignment:** Hash-based tumbling windows using `(timestamp // 60) * 60` for O(1) assignment.

**Watermark emission:** Track `max_event_timestamp`, emit windows when `window_end + allowed_lateness <= watermark`.

**Heap optimization:** Use `heapq` min-heap tracking `(completion_time, window_start)` for O(log W) emission instead of O(W) scan.

**Late event handling:** Drop events beyond `allowed_lateness` boundary to prevent unbounded state growth.

## Result

✅ **18/18 tests passing**
- Amortized O(1) per-event processing
- O(W) memory where W = active windows
- Correct event-time semantics with watermarks
- Proper late-data handling
