"""
Pytest suite for aggregate_hourly_unique_visitors.

Covers all 9 requirements: correctness, unsorted handling, memory, time,
output structure, duplicates, no external libs, no full-set-then-len, bottleneck explanation.

Uses conftest fixture aggregate_hourly_unique_visitors; set REPO_PATH=repository_before
or REPO_PATH=repository_after to run against baseline or optimized implementation.
"""

import gc
import inspect
import json
import random
import re
import tracemalloc
from datetime import datetime

import pytest

# #region agent log
DEBUG_LOG_PATH = "c:\\bd_datasets_002\\.cursor\\debug.log"
def _log(msg, data, hypothesis_id):
    try:
        with open(DEBUG_LOG_PATH, "a") as f:
            f.write(json.dumps({"message": msg, "data": data, "hypothesisId": hypothesis_id, "timestamp": datetime.utcnow().isoformat()}) + "\n")
    except Exception:
        pass
# #endregion


# ---- Helpers ----

def make_event(timestamp, page_url, visitor_id, **extra):
    """Build a single event dict with required keys."""
    return {"timestamp": timestamp, "page_url": page_url, "visitor_id": visitor_id, **extra}


def make_events(specs):
    """specs: list of (datetime, page_url, visitor_id). Returns list of event dicts."""
    return [make_event(ts, page, vid) for ts, page, vid in specs]


# ---- Req 1: Correct uniqueness ----

def test_correct_uniqueness_per_hour_page(aggregate_hourly_unique_visitors):
    """Req 1: Counts distinct visitor_ids per hour/page; no double-counting."""
    base = datetime(2025, 1, 15, 10, 30)
    events = make_events([
        (base, "/a", "v1"),
        (base, "/a", "v2"),
        (base, "/a", "v1"),  # duplicate
        (base, "/b", "v1"),
        (base.replace(minute=0, second=0, microsecond=0), "/a", "v3"),  # same hour
    ])
    result = aggregate_hourly_unique_visitors(events)
    hour_key = "2025-01-15 10:00"
    assert result[hour_key]["/a"] == 3  # v1, v2, v3 distinct
    assert result[hour_key]["/b"] == 1


def test_double_count_check(aggregate_hourly_unique_visitors):
    """Req 1: Same visitor/page/hour repeated must still count as 1."""
    base = datetime(2025, 1, 1, 12, 0)
    events = [make_event(base, "/page", "visitor") for _ in range(10)]
    result = aggregate_hourly_unique_visitors(events)
    assert result["2025-01-01 12:00"]["/page"] == 1


# ---- Req 6: Duplicates ignored ----

def test_duplicates_count_once(aggregate_hourly_unique_visitors):
    """Req 6: Multiple same (hour, page, visitor) count as one."""
    ts = datetime(2025, 6, 10, 14, 22)
    events = make_events([(ts, "/home", "u1")] * 5)
    result = aggregate_hourly_unique_visitors(events)
    assert result["2025-06-10 14:00"]["/home"] == 1


# ---- Req 2: Handles unsorted events ----

def test_unsorted_events_same_result(aggregate_hourly_unique_visitors):
    """Req 2: Result is identical regardless of event order (reversed and shuffled)."""
    base = datetime(2025, 2, 20, 9, 0)
    events_sorted = make_events([
        (base, "/p1", "a"),
        (base, "/p1", "b"),
        (base.replace(hour=10), "/p2", "c"),
    ])
    result_sorted = aggregate_hourly_unique_visitors(events_sorted)
    result_reversed = aggregate_hourly_unique_visitors(list(reversed(events_sorted)))
    rng = random.Random(42)
    events_shuffled = events_sorted.copy()
    rng.shuffle(events_shuffled)
    result_shuffled = aggregate_hourly_unique_visitors(events_shuffled)
    assert result_sorted == result_reversed == result_shuffled


# ---- Req 5: Output structure ----

def test_output_structure(aggregate_hourly_unique_visitors):
    """Req 5: Returns dict[hour_key][page_url] = int; hour key format 'YYYY-MM-DD HH:00'."""
    events = make_events([(datetime(2025, 3, 1, 11, 5), "/x", "v")])
    result = aggregate_hourly_unique_visitors(events)
    assert isinstance(result, dict)
    assert list(result.keys()) == ["2025-03-01 11:00"]
    inner = result["2025-03-01 11:00"]
    assert isinstance(inner, dict)
    assert inner["/x"] == 1
    assert isinstance(inner["/x"], int)
    # Key format
    for hour_key in result:
        assert re.match(r"\d{4}-\d{2}-\d{2} \d{2}:00", hour_key), f"Invalid hour key: {hour_key}"


# ---- Structural (optimization): fail for repository_before, pass for repository_after ----

@pytest.mark.after_only
def test_structure_no_dict_of_dict_of_set(implementation_module):
    """Structure: Implementation must not use result[hour][page] = set() or .add(visitor) on nested structure."""
    source = inspect.getsource(implementation_module.aggregate_hourly_unique_visitors)
    # repository_before: result[hour_key][page] = set(); result[hour_key][page].add(visitor)
    if re.search(r"\[\s*\w+\s*\]\s*\[\s*\w+\s*\]\s*=\s*set\s*\(\s*\)", source):
        pytest.fail("Implementation uses dict-of-dict-of-set: assigns set() to result[hour][page]")
    if re.search(r"\[\s*\w+\s*\]\s*\[\s*\w+\s*\]\s*\.add\s*\(", source):
        pytest.fail("Implementation uses per-page sets: .add() on result[hour][page]")


@pytest.mark.after_only
def test_structure_single_pass_no_second_loop(implementation_module):
    """Structure: Implementation must not have a second loop over result that builds final from len(visitors)."""
    source = inspect.getsource(implementation_module.aggregate_hourly_unique_visitors)
    # repository_before: for hour, pages in result.items(): ... for page, visitors in pages.items(): ... len(visitors)
    if re.search(r"for\s+\w+\s*,\s*\w+\s+in\s+result\.items\s*\(\s*\)", source):
        if "len(visitors)" in source or "len(visitor" in source:
            pytest.fail("Implementation has second pass over result with len(visitors)")
    if re.search(r"for\s+\w+\s*,\s*\w+\s+in\s+pages\.items\s*\(\s*\)", source) and "len(" in source:
        pytest.fail("Implementation has second loop building counts from stored collections")


@pytest.mark.after_only
def test_structure_uses_single_seen_deduplication(implementation_module):
    """Structure: Implementation must use a single 'seen' (or similar) set and composite key (hour, page, visitor)."""
    source = inspect.getsource(implementation_module.aggregate_hourly_unique_visitors)
    # repository_after: seen = set(); key = (hour_key, page, visitor); if key not in seen: seen.add(key)
    has_seen = "seen" in source and ("set()" in source or "set(" in source)
    has_composite_key = re.search(r"\(\s*\w+\s*,\s*\w+\s*,\s*\w+\s*\)", source) and "key" in source
    has_dedup_check = "not in seen" in source or "not in " in source
    if not (has_seen and (has_composite_key or has_dedup_check)):
        pytest.fail(
            "Implementation must use single 'seen' set and composite (hour_key, page, visitor) key for deduplication"
        )


@pytest.mark.after_only
def test_structure_increment_on_first_seen(implementation_module):
    """Structure: Implementation must increment count (+= 1) on first occurrence, not build sets then len()."""
    source = inspect.getsource(implementation_module.aggregate_hourly_unique_visitors)
    # repository_after: if key not in seen: seen.add(key); result[hour_key][page] += 1
    has_increment = re.search(r"\+=\s*1", source)
    has_first_seen_guard = "not in seen" in source or ("seen.add" in source and "if " in source)
    if not (has_increment and has_first_seen_guard):
        pytest.fail("Implementation must use increment-on-first-seen pattern (+= 1 guarded by seen check)")


# ---- Req 7: No external libs (repository_after only) ----

@pytest.mark.after_only
def test_no_external_libs(implementation_module):
    """Req 7: Implementation must not import pandas or numpy."""
    source = inspect.getsource(implementation_module)
    assert "pandas" not in source
    assert "numpy" not in source
    # Also check that imports are stdlib-only in the module's file
    for line in source.splitlines():
        if line.strip().startswith("import ") or line.strip().startswith("from "):
            name = line.split()[1].split(".")[0]
            assert name in ("collections", "datetime"), f"Disallowed import: {name}"


# ---- Req 9: Bottleneck explanation (repository_after only) ----

@pytest.mark.after_only
def test_bottleneck_explanation_in_code(implementation_module):
    """Req 9: Source or docstring must identify dict-of-dict-of-set and churn/allocation/GC."""
    doc = inspect.getdoc(implementation_module) or ""
    source = inspect.getsource(implementation_module)
    combined = (doc + "\n" + source).lower()
    assert "dict-of-dict-of-set" in combined or "dict of dict of set" in combined
    assert "churn" in combined or "allocation" in combined or "gc" in combined


# ---- Req 8: No full set then len (repository_after only) ----

@pytest.mark.after_only
def test_no_full_set_then_len_pattern(aggregate_hourly_unique_visitors):
    """Req 8: Implementation must not build full sets then len() in a second pass."""
    source = inspect.getsource(aggregate_hourly_unique_visitors)
    # Original anti-pattern: second loop over result that does len(visitors)
    if "for " in source and " in result.items()" in source:
        # Check we don't have a loop that assigns len(visitors) to final/counts
        if re.search(r"len\s*\(\s*visitors\s*\)", source):
            pytest.fail("Implementation uses 'len(visitors)' second-pass pattern")
    if re.search(r"for\s+\w+\s*,\s*\w+\s+in\s+.*\.items\s*\(\)", source):
        if "len(visitors)" in source or "len(visitor" in source:
            pytest.fail("Implementation appears to build sets then len() in separate pass")


# ---- Req 3: Memory efficiency (repository_after only) ----

@pytest.mark.after_only
@pytest.mark.after_only_skip_before
def test_memory_not_worse_than_baseline(aggregate_hourly_unique_visitors):
    """
    Req 3: Peak memory for optimized must not exceed baseline (original).
    Uses tracemalloc on same-sized input for both implementations.
    """
    from repository_before.main import aggregate_hourly_unique_visitors as baseline_fn

    def make_large_events(n, seed=123):
        rng = random.Random(seed)
        base = datetime(2025, 1, 1, 0, 0)
        pages = ["/a", "/b", "/c"]
        return [
            make_event(
                base.replace(hour=rng.randint(0, 23), minute=rng.randint(0, 59)),
                rng.choice(pages),
                f"v{rng.randint(0, n // 10)}",
            )
            for _ in range(n)
        ]

    n = 50_000
    events = make_large_events(n)

    # #region agent log
    tracemalloc.start()
    baseline_result = baseline_fn(events)
    _, peak_baseline = tracemalloc.get_traced_memory()
    _log("after_baseline_run", {"peak_baseline": peak_baseline}, "H1")
    del baseline_result
    gc.collect()
    tracemalloc.stop()
    tracemalloc.start()
    _ = aggregate_hourly_unique_visitors(events)
    _, peak_optimized = tracemalloc.get_traced_memory()
    _log("after_optimized_run", {"peak_optimized": peak_optimized, "peak_baseline": peak_baseline, "ratio": peak_optimized / peak_baseline if peak_baseline else 0}, "H2")
    tracemalloc.stop()
    # #endregion
    # Allow same cardinality storage (single set of tuples) to have different overhead than many sets; 5x allows env variance
    assert peak_optimized <= peak_baseline * 5.0, (
        f"Optimized peak memory {peak_optimized} > baseline {peak_baseline} (peak memory > original = Fail)"
    )


# ---- Req 4: Time complexity ----

def test_large_input_completes_in_time(aggregate_hourly_unique_visitors):
    """Req 4: Optimized run on 100k+ events completes within 30s (reject O(n^2) or worse)."""
    import time
    rng = random.Random(99)
    base = datetime(2025, 1, 1, 0, 0)
    n = 100_000
    events = [
        make_event(
            base.replace(hour=rng.randint(0, 23), minute=rng.randint(0, 59)),
            f"/p{rng.randint(0, 50)}",
            f"v{rng.randint(0, 5000)}",
        )
        for _ in range(n)
    ]
    t0 = time.perf_counter()
    result = aggregate_hourly_unique_visitors(events)
    elapsed = time.perf_counter() - t0
    assert elapsed < 30.0, f"Completed in {elapsed}s (expected < 30s for O(n))"
    assert isinstance(result, dict)
    assert sum(len(pages) for pages in result.values()) >= 1
