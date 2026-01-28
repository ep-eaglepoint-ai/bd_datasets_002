# Trajectory: Atomic Hierarchy Traversal Refactor

### 1. Phase 1: AUDIT / REQUIREMENTS ANALYSIS
**Guiding Question**: "What exactly needs to be built, and what are the constraints?"

**Reasoning**:
The primary goal is to refactor a fragile recursive hierarchy traversal into a robust, iterative, thread-safe service. The system must efficiently calculate total weights in a DAG (Directed Acyclic Graph) structure where nodes can be shared. It faces strict production constraints: limited heap memory (128MB) and high concurrency requirements.

**Key Requirements**:
- **Strictly Iterative**: Immunity to stack depth limits; no recursion allowed.
- **DAG Correctness**: Shared children matching `Node A -> B, Node C -> B` must have B's weight counted once per query.
- **Cycle Detection**: Must raise `CircularDependencyError` with the specific node closing the loop.
- **Memory Efficiency**: Generational caching strategy staying within 128MB heap.
- **Atomic Invalidation**: Updates to a node invalidate only that node and its ancestors.
- **Thread Safety**: Concurrent partial updates and reads must be mathematically consistent.
- **Testing**: Specific stress tests for cycles (10k nodes), diamonds, and concurrency (50 threads).

**Constraints Analysis**:
- **Forbidden**: Recursion, O(N) searches in hot paths, unbounded caching.
- **Required**: Custom exception types, thread locking or lock-free structures, explicit stack management.

### 2. Phase 2: QUESTION ASSUMPTIONS (Challenge the Premise)
**Guiding Question**: "Is there a simpler way? Why are we implementing this from scratch?"

**Reasoning**:
Standard libraries (like `networkx`) could handle traversal, but:
- They often rely on recursion or don't support the specific "Atomic Invalidation" requirement efficiently.
- We need precise control over the separate "Generational Cache" to fit the 128MB limit.
- The integration of concurrent updates with reader-writer consistency in a specific hierarchy semantic is unique to the domain.

**Scope Refinement**:
- **Initial Assumption**: We might need a complex graph database.
- **Refinement**: In-memory management with explicit locking and iterative traversal is sufficient and performant for the scale implied (128MB heap suggests millions of nodes max, likely fewer with heavy objects).

### 3. Phase 3: DEFINE SUCCESS CRITERIA (Establish Measurable Goals)
**Guiding Question**: "What does 'done' mean in concrete, measurable terms?"

**Success Criteria**:
1.  **Iterative Traversal**: Zero `RecursionError` even with deep hierarchies.
2.  **DAG Sum**: Diamond structures sum correctly (shared child weight counts once per parent query context).
    *Clarification*: If query is on Root, and Root -> A -> B and Root -> B, B is counted once? *Correction*: In a hierarchy often "reports" are distinct. If strictly DAG, yes, B is one entity. Requirement says "child's weight (and its subtree) must only be summed once per call".
3.  **Cycle Safety**: `CircularDependencyError` is raised immediately upon closing a loop.
4.  **Cache limits**: Memory usage stays < 128MB under load.
5.  **Invalidation Scope**: Updating leaf X only invalidates X and ancestors(X). Unrelated branches remain cached.
6.  **Concurrency**: 50 threads can read/write without race conditions or data corruption.
7.  **Tests**: All 3 specific test scenarios (Diamond, Adversarial Cycle, Stress) pass.

### 4. Phase 4: MAP REQUIREMENTS TO VALIDATION (Define Test Strategy)
**Guiding Question**: "How will we prove the solution is correct and complete?"

**Test Strategy**:
- **Unit Tests**:
    - `test_diamond_dag`: Verify exact weight matches for diamond dependency.
    - `test_cycle_detection`: 10,000 node chain with loop back to start.
    - `test_iterative_depth`: Verify no stack overflow on extremely deep linear chains.
- **Integration Tests**:
    - `test_concurrency_stress`: 50 threads mixing `get_weight` and `update_value`.
    - `test_cache_invalidation`: Update node, verify ancestor cache cleared, unrelated cache intact.
- **Logic**:
    - `test_generational_eviction`: Verify cache size control (mocking checking memory or count).

### 5. Phase 5: SCOPE THE SOLUTION
**Guiding Question**: "What is the minimal implementation that meets all requirements?"

**Components to Create**:
- **Core Service**: `repository_after/hierarchy_service.py` containing:
    - `Node` class (likely enhanced or wrapped).
    - `HierarchyService` class with `get_total_weight` and `update_node_value`.
    - Internal `_traverse_iteratively` method.
    - Internal `_invalidat_ancestors` method.
    - `GenerationalCache` helper class.
- **Test Suite**: `tests/`
    - `test_hierarchy.py`
    - `test_concurrency.py`

### 6. Phase 6: TRACE DATA/CONTROL FLOW (Follow the Path)
**Guiding Question**: "How will data/control flow through the new system?"

**Read Flow (get_total_weight)**:
1. Check Cache for `node_id`. If hit & valid generation -> Return.
2. Initialize `stack` with `node_id`.
3. While stack not empty:
    - Peek node.
    - Identify children.
    - Detect cycles (check `path` set).
    - If children processed:
        - Sum weights (avoiding double counts via `visited` in current traversal scope).
        - Cache result.
        - Pop.
    - Else:
        - Push children.
4. Return total.

**Write Flow (update_node_value)**:
1. Acquire Write Lock.
2. Update `node.value`.
3. Increment `node.generation` (or global generation, but node-local is better for atomic invalidation).
4. Identify Ancestors (requires Reverse Map or search).
    - *Constraint Check*: Does `Node` store parents? If not, we might need to build/maintain a parent map.
    - Requirement 5 implies we must efficiently find ancestors.
5. Invalidate/Update Ancestors in Cache.
6. Release Lock.

### 7. Phase 7: ANTICIPATE OBJECTIONS (Play Devil's Advocate)
**Objection 1**: "Iterative traversal is harder to read."
- **Counter**: Necessary for stability. We will document the stack logic clearly.

**Objection 2**: "Global locking kills performance."
- **Counter**: We will use fine-grained locking or Read/Write locks (`Rlock` or `ReaderWriterLock`) to allow concurrent reads.

**Objection 3**: "Reverse map maintenance is expensive."
- **Counter**: Essential for "Atomic Invalidation". We will maintain it lazily or eagerly on edge changes. (Assuming structure is static, just values change? prompt implies "updating... value", strictly value updates are O(1) if structure is static. If structure changes, we update parent map). *Assumption*: Only values change based on "Atomic Invalidation: updating a specific node's value".

### 8. Phase 8: VERIFY INVARIANTS / DEFINE CONSTRAINTS
**Guiding Question**: "What constraints must the new system satisfy?"

**Must Satisfy**:
- **Heap Limit**: 128MB.
- **Thread Safety**: No race conditions.

### 9. Phase 9: EXECUTE WITH SURGICAL PRECISION (Ordered Implementation)
**Guiding Question**: "In what order should changes be made to minimize risk?"

1. **Step 1: Scaffolding**: Create package structure, tests setup.
2. **Step 2: Core Data Structures**: `Node`, `Cache` stub.
3. **Step 3: Iterative Traversal**: Implement DFS without recursion.
4. **Step 4: Cycle & DAG Logic**: Add `visited`/`path` tracking.
5. **Step 5: Integration**: Connect traversal to `get_weight`.
6. **Step 6: Caching**: Implement generational cache.
7. **Step 7: Invalidation**: Implement ancestor invalidation (assuming static graph structure for now, or building parent map).
8. **Step 8: Thread Safety**: Add locks.
9. **Step 9: Testing**: Run the 3 critical tests.

### 10. Phase 10: MEASURE IMPACT / VERIFY COMPLETION
**Guiding Question**: "Did we build what was required? Can we prove it?"

**Requirements Completion**:
- **REQ-1**: Iterative ✅
- **REQ-2**: DAG Correctness ✅
- **REQ-3**: Cycle Error ✅
- **REQ-4**: 128MB Limit ✅
- **REQ-5**: Atomic Invalidation ✅
- **REQ-6**: Thread Safe ✅
- **REQ-7**: Diamond Test ✅
- **REQ-8**: 10k Cycle Test ✅
- **REQ-9**: Concurrency Test ✅

### 11. Phase 11: DOCUMENT THE DECISION (Capture Context for Future)
**Problem**: Recursive traversal crashes and is inefficient for frequent updates.
**Solution**: Iterative, cached, thread-safe service.
**Trade-offs**: Code complexity vs Runtime stability.
