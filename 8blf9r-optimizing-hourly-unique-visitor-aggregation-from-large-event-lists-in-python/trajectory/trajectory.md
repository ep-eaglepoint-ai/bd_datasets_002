# Trajectory: Optimizing Hourly Unique Visitor Aggregation from Large Event Lists in Python

## 1. AUDIT / REQUIREMENTS ANALYSIS
**Guiding Question**: *What exactly needs to be built, and what are the constraints?*

The objective is an **OPTIMIZATION** task: refactoring legacy aggregation code that processes millions of pageview events per day. The current implementation is slow during peak hours (high CPU, delayed reports). The function must remain correct while significantly reducing time and memory.

### Core Requirements
* **Correct uniqueness**: Count distinct `visitor_id` per (hour, page); double-counting = Fail.
* **Order independence**: Must work regardless of timestamp order; assuming sorted = Fail.
* **Memory efficiency**: Avoid or minimize full sets; peak memory must not exceed original.
* **Time complexity**: Target O(n) with low constants; keeping nested loops without optimization = Fail.
* **Output structure**: Preserve `dict[hour_key][page_url] = int(count)`; different nesting or keys = Fail.
* **Duplicates**: Multiple same (visitor, page, hour) count as one; overcounts = Fail.
* **No external libs**: Stdlib only (e.g. `collections`, `datetime`); pandas/numpy = Fail.
* **No “full set then len()”**: Increment-on-first-seen or equivalent; building sets then `len()` in a second pass = Fail if not used smartly.
* **Bottleneck explanation**: Comments must correctly identify dict-of-dict-of-set churn as the main issue; wrong diagnosis = Fail.

### Constraint Analysis
* **Input**: Large list of event dicts (`timestamp`, `page_url`, `visitor_id`), often 500k+ per batch; may be unsorted or contain duplicates.
* **Output**: Nested dict structure must be preserved for downstream consumers.
* **Validation**: All of the above must be provable via tests and code comments.

---

## 2. QUESTION ASSUMPTIONS
**Guiding Question**: *Why are we doing this? Is this the right approach?*

* **Initial Assumption**: "We could use pandas/numpy for speed."
    * **Reality**: Requirements explicitly forbid external libraries; only stdlib is allowed.
* **Initial Assumption**: "Events are sorted by timestamp, so we can stream."
    * **Reality**: Requirement says "works regardless of timestamp order"; assuming sorted = Fail. Solution must be order-independent.
* **Initial Assumption**: "We need to keep per-page sets to count unique visitors."
    * **Reality**: We only need counts. Storing full sets is the main bottleneck (many small sets, allocation churn, GC pressure). A single flat "seen" set of `(hour_key, page, visitor)` with increment-on-first-seen avoids per-page sets and a second pass.
* **Lesson**: Correct diagnosis of the bottleneck (dict-of-dict-of-set churn) is a pass/fail requirement; optimization must not sacrifice correctness or output shape.

---

## 3. DEFINE SUCCESS CRITERIA
**Guiding Question**: *What does "done" mean in concrete, measurable terms?*

**[Correctness: Uniqueness]**:
- **Acceptance Criteria**: Distinct visitor count per (hour, page) matches a reference; duplicates count once.
- **Verification Method**: Pytest tests with known events; repeat same (hour, page, visitor) and assert count remains 1.

**[Correctness: Unsorted]**:
- **Acceptance Criteria**: Same event list in different orders yields identical result.
- **Verification Method**: Run aggregation on sorted, reversed, and shuffled lists; assert results equal.

**[Performance: Memory]**:
- **Acceptance Criteria**: Peak memory of optimized implementation ≤ baseline (e.g. via tracemalloc on same-sized input).
- **Verification Method**: Test that runs both implementations on 50k events and compares peak allocated memory.

**[Performance: Time]**:
- **Acceptance Criteria**: 100k+ events complete in under 30s (reject O(n²) or worse).
- **Verification Method**: Large-input pytest with timing assertion.

**[Structure & Constraints]**:
- **Acceptance Criteria**: Output is `dict[str, dict[str, int]]`; hour keys match `YYYY-MM-DD HH:00`; no pandas/numpy; bottleneck explanation in code.
- **Verification Method**: Structure tests, import-inspection test, and source/docstring check for "dict-of-dict-of-set" and churn/allocation/GC.

---

## 4. MAP REQUIREMENTS TO VALIDATION
**Guiding Question**: *How will we prove the solution is correct and complete?*

| Requirement | Test Strategy | Test Category |
| :--- | :--- | :--- |
| **Correct uniqueness** | Known (hour, page, visitor) counts; duplicate events count once. | Functional |
| **Unsorted events** | Same events, different order → same result. | Functional |
| **Output structure** | Type and key format checks for dict → dict → int. | Structural |
| **Duplicates ignored** | Multiple same (hour, page, visitor) → count 1. | Functional |
| **No external libs** | Inspect `repository_after.main` source for imports. | Constraint |
| **Bottleneck explanation** | Source/docstring contains "dict-of-dict-of-set" and churn/allocation/GC. | Constraint |
| **No full set then len()** | Source does not use second-pass `len(visitors)` pattern. | Constraint |
| **Memory efficiency** | tracemalloc: optimized peak ≤ baseline on same input. | Performance |
| **Time complexity** | 100k events complete in &lt; 30s. | Performance |

**Mental Checkpoint**: "If we only store counts and a single 'seen' set, do we still handle duplicates and unsorted input? Yes: the key (hour_key, page, visitor) is order-independent and deduplicates correctly."

---

## 5. SCOPE THE SOLUTION
**Guiding Question**: *What is the minimal implementation that meets all requirements?*

### Component Inventory
* **`repository_after/main.py`**: Optimized `aggregate_hourly_unique_visitors` with module and function docstrings explaining the dict-of-dict-of-set bottleneck; single-pass, one `seen` set of `(hour_key, page, visitor)`, `defaultdict(lambda: defaultdict(int))` for counts; return plain dict for output compatibility.
* **`repository_after/__init__.py`**: Re-export `aggregate_hourly_unique_visitors`.
* **`tests/conftest.py`**: Session fixtures driven by `REPO_PATH` env (repository_before | repository_after); `after_only` marker for tests that apply only to repository_after (no external libs, bottleneck text, no full-set-then-len, memory comparison).
* **`tests/test_aggregate_hourly_unique_visitors.py`**: Pytest suite covering all nine requirements; uses fixture for implementation so the same tests run against before and after when invoked with different `REPO_PATH`.
* **`evaluation/evaluation.py`**: Runs pytest twice (REPO_PATH=repository_before, then repository_after); parses summary; writes `evaluation/<date>/<time>/report.json` with before/after comparison and environment info.
* **Docker**: Dockerfile and docker-compose with three documented commands—pytest for repository_before, pytest for repository_after, and evaluation script—with evaluation directory mounted for report output.

---

## 6. TRACE DATA/CONTROL FLOW
**Guiding Question**: *How will data/control flow through the new system?*

**Designed Flow (optimized implementation)**:
1. **Input**: List of event dicts (`timestamp`, `page_url`, `visitor_id`).
2. **Single pass**: For each event, compute `hour_key` via `strftime('%Y-%m-%d %H:00')` (after optional `replace(minute=0, second=0, microsecond=0)`).
3. **Deduplication**: Form key `(hour_key, page, visitor)`. If key not in `seen`, add to `seen` and increment `result[hour_key][page]` (defaultdict of defaultdict(int)).
4. **Output**: Convert to plain dict: `{hour: dict(pages) for hour, pages in result.items()}` so structure is `dict[str, dict[str, int]]`.
5. **Testing**: conftest reads `REPO_PATH`; fixtures provide the correct implementation module and function; tests run once per invocation (before or after); evaluation script runs both and writes report.

**Key invariant**: Each (hour_key, page, visitor) is counted at most once, regardless of order or duplicates in the input.

---

## 7. ANTICIPATE OBJECTIONS
**Guiding Question**: *What could go wrong? What objections might arise?*

**Objection 1**: "A single global 'seen' set still stores every unique (hour, page, visitor)—same cardinality as the original sets."
- **Counter**: Cardinality is the same, but we have one set instead of many; we avoid dict-of-dict-of-set churn, fewer allocations, no second pass, and counts are stored as ints immediately. Memory overhead and GC pressure are reduced; requirement is "peak memory > original = Fail," and we satisfy it by avoiding extra structure and second traversal.

**Objection 2**: "Using strftime per event is still a cost."
- **Counter**: It is a constant-factor cost; the main win is removing the dict-of-dict-of-set pattern and the second pass. Optional micro-optimization: cache hour_key by (date, hour) if needed later.

**Objection 3**: "Tests run against both repository_before and repository_after—won’t repository_before fail the 'after_only' tests?"
- **Counter**: Those tests are marked `@pytest.mark.after_only` and skipped when `REPO_PATH=repository_before` via `pytest_collection_modifyitems` in conftest. Baseline runs only shared correctness/structure/time tests; after runs the full suite including memory, no external libs, bottleneck text, and no full-set-then-len.

---

## 8. VERIFY INVARIANTS / DEFINE CONSTRAINTS
**Guiding Question**: *What must remain true throughout the implementation?*

**Must satisfy**:
- Output is exactly `dict[hour_key][page_url] = int(count)` with hour_key format `YYYY-MM-DD HH:00`. ✓
- Every (hour, page, visitor) is counted at most once. ✓
- No imports outside stdlib (e.g. `collections`, `datetime`). ✓
- Code comments/docstrings identify dict-of-dict-of-set churn as the main bottleneck. ✓

**Must not violate**:
- No pandas/numpy or other external libs. ✓
- No pattern of building full sets then calling `len()` in a separate pass. ✓
- No assumption that events are sorted. ✓

---

## 9. EXECUTE WITH SURGICAL PRECISION
**Guiding Question**: *In what order should changes be made to minimize risk?*

1. **Step 1: Optimized implementation** — Implement `aggregate_hourly_unique_visitors` in `repository_after/main.py` with single-pass, `seen` set, and bottleneck explanation in docstring/comments.
   - *Rationale*: Core behavior and correctness first; output structure must match original.
2. **Step 2: Package export** — Re-export in `repository_after/__init__.py`.
   - *Rationale*: Keeps imports simple for tests and evaluation.
3. **Step 3: Test harness** — Add `conftest.py` with `REPO_PATH`-driven fixtures and `after_only` marker/skip logic.
   - *Rationale*: Enables running the same test module against before and after.
4. **Step 4: Test suite** — Implement all nine requirement tests using fixtures; mark after-only tests appropriately.
   - *Risk*: **High**. Coverage of all criteria is pass/fail for the task.
5. **Step 5: Evaluation script** — Port evaluation logic to Python: run pytest for repository_before and repository_after, parse output, write report.json under `evaluation/<date>/<time>/`.
   - *Rationale*: Matches TypeScript evaluation structure for automation.
6. **Step 6: Docker and docs** — Dockerfile default CMD to evaluation; docker-compose with volume for evaluation; README with three commands (pytest before, pytest after, evaluation). Use `REPO_PATH` (not IMPLEMENTATION) as the env var name.

---

## 10. MEASURE IMPACT / VERIFY COMPLETION
**Guiding Question**: *Did we build what was required? Can we prove it?*

**Requirements Completion**:
- **Correct uniqueness and duplicates**: Tests with known events and repeated (hour, page, visitor) assert correct counts. ✓
- **Unsorted events**: Reversed and shuffled inputs produce same result. ✓
- **Output structure**: Type and key-format tests. ✓
- **No external libs**: Import inspection on implementation module. ✓
- **Bottleneck explanation**: Source/docstring check for "dict-of-dict-of-set" and churn/allocation/GC. ✓
- **No full set then len()**: Source check for second-pass len(visitors) pattern. ✓
- **Memory**: tracemalloc comparison (optimized ≤ baseline) on 50k events. ✓
- **Time**: 100k events complete within 30s. ✓

**Quality Metrics**:
- All tests runnable via Docker with `REPO_PATH=repository_before` and `REPO_PATH=repository_after`.
- Evaluation report generated under `evaluation/<date>/<time>/report.json` with before/after results and comparison.

---

## 11. DOCUMENT THE DECISION
**Guiding Question**: *Why did we do this, and when should it be revisited?*

* **Problem**: Legacy aggregation used a dict-of-dict-of-set pattern, causing high allocation churn, GC pressure, and a second pass to convert sets to counts under 500k+ events.
* **Solution**: Single-pass aggregation with one flat `seen` set of `(hour_key, page, visitor)` and immediate count increment via `defaultdict(lambda: defaultdict(int))`; return plain dict to preserve output structure.
* **Trade-offs**: We still store one set of all unique (hour, page, visitor) keys; we gain fewer container objects, no second pass, and lower constant factors. No external libs and no change to API or output shape.
* **Why this works**: Correctness is order-independent and duplicate-safe; the bottleneck explanation in code satisfies the requirement; tests and evaluation script prove correctness and performance constraints.
* **When to revisit**: If event volume grows to tens of millions per batch, consider streaming or chunked processing; if hour_key formatting becomes a measurable cost, add a small cache keyed by (date, hour).
