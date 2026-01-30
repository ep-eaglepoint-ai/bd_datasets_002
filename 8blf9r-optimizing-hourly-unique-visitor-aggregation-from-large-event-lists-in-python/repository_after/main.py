"""
Hourly unique visitor aggregation (optimized).

PERFORMANCE BOTTLENECKS IN THE ORIGINAL IMPLEMENTATION:
-------------------------------------------------------
The main bottleneck was the dict-of-dict-of-set pattern. For each event, the
original code performed multiple dict lookups, possible dict allocations, and
set growth. At scale (500k+ events), this caused:
- Many small set objects (one per (hour, page) pair), leading to high
  allocation churn and GC pressure.
- Every unique visitor_id string stored in memory per (hour, page), so memory
  grew with unique visitors and caused cache misses.
- A second pass over the entire structure to convert sets to counts via len(),
  keeping large sets alive longer and doubling traversal overhead.

Secondary issues: strftime() per event adds constant-factor cost; building full
sets then calling len() in a separate pass is redundant when we only need counts.

This refactor uses a single flat "seen" set of (hour_key, page, visitor) tuples
and increments counts on first-seen only, in one pass. Same cardinality of
stored keys as the original sets, but one container instead of many, with
immediate count conversion and no second traversal. Time: O(n), lower constant
factors. Memory: fewer allocations, better locality.
"""

from collections import defaultdict
from datetime import datetime


def aggregate_hourly_unique_visitors(events):
    """
    Optimized aggregation of hourly unique visitors per page.

    Args:
        events: List of dicts with 'timestamp' (datetime), 'page_url' (str),
                'visitor_id' (str). Order does not matter; duplicates are
                counted once per (hour, page, visitor).

    Returns:
        dict[hour_key, dict[page_url, int]]: For each hour (format 'YYYY-MM-DD HH:00')
        and page, the count of distinct visitor_ids.

    Complexity: O(n) single pass; one flat set for deduplication, no dict-of-dict-of-set.
    """
    # Final result: hour -> page -> count (defaultdict avoids per-event dict checks)
    result = defaultdict(lambda: defaultdict(int))

    # Track seen (hour_key, page, visitor) to prevent double-counting. Single set
    # instead of many per-(hour, page) sets reduces allocation churn and GC pressure.
    seen = set()

    for event in events:
        ts = event["timestamp"]
        page = event["page_url"]
        visitor = event["visitor_id"]

        # Normalize to hour; strftime for exact output key format
        hour_ts = ts.replace(minute=0, second=0, microsecond=0)
        hour_key = hour_ts.strftime("%Y-%m-%d %H:00")

        key = (hour_key, page, visitor)

        if key not in seen:
            seen.add(key)
            result[hour_key][page] += 1

    # Return plain dict[str, dict[str, int]] to match original output structure
    return {hour: dict(pages) for hour, pages in result.items()}
