# Trajectory (Thinking Process for Refactoring)

## 1. Audit the Original Code (Identify Scaling Problems)

I audited the original code. It contained nested loops resulting in O(n^2) complexity, causing performance degradation for large datasets. Crucially, it relied on a shared mutable state (`cachedStock`) at the class level, rendering the API thread-unsafe and creating race conditions during concurrent access.

## 2. Define a Performance Contract First

I defined performance conditions: the aggregation must be linear O(n), the controller must be stateless to support concurrency, and inputs must be strictly validated to prevent data corruption (e.g., negative quantities).

## 3. Rework the Data Model for Efficiency

I moved the `Item` class from a static inner class to a standalone POJO to promote cleaner separation of concerns and simpler testing. I replaced the class-level `cachedStock` map with a method-local `HashMap`, ensuring request isolation.

## 4. Rebuild the Aggregation Logic

I replaced the inefficient N+1 style nested loop iteration with a single-pass aggregation pipeline.
**Before:**

```java
for (int i = 0; i < items.size(); i++) {
    for (int j = 0; j < items.size(); j++) { ... }
}
```

**After:**

```java
for (Item item : items) {
    totals.merge(item.getSku(), item.getQuantity(), Integer::sum);
}
```

## 5. Remove Shared Mutable State

I eliminated the `cachedStock` field completely. By strictly using local variables within the `aggregate` method, the API became inherently thread-safe without requiring complex synchronization locks.

## 6. Add Input Validation

I added validation logic to reject invalid states early. Negative quantities now return `400 Bad Request`, and null items or inputs are handled gracefully, protecting the computation logic from runtime exceptions.

## 7. Result: Measurable Performance Gains + Predictable Signals

The solution now handles 10,000 items in under 100ms (verified by `testAggregate_LargeDataset`). Concurrency tests (`testAggregate_Concurrency`) prove that multiple threads can operate simultaneously without data interference.

---

# Trajectory Transferability Notes

The above trajectory is designed for **Refactoring**. The steps outlined in it represent reusable thinking nodes (audit, contract definition, structural changes, execution, and verification).

The same nodes can be reused to transfer this trajectory to other hard-work categories (such as full-stack development, performance optimization, testing, and code generation) by changing the focus of each node, not the structure.

Below are the nodes extracted from this trajectory. These nodes act as a template that can be mapped to other categories by adapting the inputs, constraints, and validation signals specific to each task type.

### Refactoring → Full-Stack Development

- **Replace code audit** with system & product flow audit
- **Performance contract** becomes API, UX, and data contracts
- **Data model refactor** extends to DTOs and frontend state shape
- **Query optimization** maps to API payload shaping
- **Pagination** applies to backend + UI (cursor / infinite scroll)
- **Add API schemas**, frontend data flow, and latency budgets

### Refactoring → Performance Optimization

- **Code audit** becomes runtime profiling & bottleneck detection
- **Performance contract** expands to SLOs, SLAs, latency budgets
- **Data model changes** include indexes, caches, async paths
- **Query refactors** focus on hot paths
- **Verification** uses metrics, benchmarks, and load tests
- **Add observability tools** and before/after measurements

### Refactoring → Testing

- **Code audit** becomes test coverage & risk audit
- **Performance contract** becomes test strategy & guarantees
- **Data assumptions** convert to fixtures and factories
- **Stable ordering** maps to deterministic tests
- **Final verification** becomes assertions & invariants
- **Add test pyramid placement** and edge-case coverage

### Refactoring → Code Generation

- **Code audit** becomes requirements & input analysis
- **Performance contract** becomes generation constraints
- **Data model refactor** becomes domain model scaffolding
- **Projection-first thinking** becomes minimal, composable output
- **Verification** ensures style, correctness, and maintainability
- **Add input/output specs** and post-generation validation

## Core Principle (Applies to All)

- **The trajectory structure stays the same**
- **Only the focus and artifacts change**
- **Audit → Contract → Design → Execute → Verify remains constant**
