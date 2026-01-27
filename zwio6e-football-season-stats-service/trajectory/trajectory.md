# Trajectory

1. **Runtime Profiling & Bottleneck Detection**:
   I started by auditing the codebase to identify performance bottlenecks. I immediately noticed `Thread.sleep()` calls simulating latency and an efficient N+1 loop structure where match data was generated individually inside the request path. Moving this simulation to a pure-logic approach was the first priority.
   *Resource: [The N+1 Problem in Hibernate and APIs](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm-object-relational-mapping)*

2. **Defining Performance SLOs**:
   The requirement specified a strict latency budget of < 200ms. I established this as the Service Level Objective (SLO). Every architectural decision, from removing blocking calls to optimizing the aggregation loop, was made to ensure we consistently meet this target under load.
   *Resource: [Google SRE Book - Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)*

3. **Data Model Optimization**:
   I replaced the untyped `Map<String, Object>` structures with strongly typed DTOs (`MatchStats` and `SeasonStats`). This not only improved code readability but also eliminated the overhead of dynamic map lookups and casting during the aggregation phase, streamlining the data path.
   *Resource: [Effective Java - Item 61: Prefer primitive types to boxed primitives](https://books.google.com/books/about/Effective_Java.html)*

4. **Hot Path Refactoring**:
   The core aggregation logic (summing goals and fouls) was refactored from a nested loop structure into a single O(N) pass. I also replaced the inefficient sorting mechanism (which had artificial delays) with a standard `List.sort()` using a dedicated Comparator, ensuring the critical execution path remains linear and non-blocking.
   *Resource: [Big O Notation and Algorithm Analysis](https://www.geeksforgeeks.org/analysis-of-algorithms-set-1-asymptotic-analysis/)*

5. **Concurrency & Thread Safety**:
   To ensure scalability, I removed all state from the Controller and Service, making them thread-safe singletons. I used `ThreadLocalRandom` for data generation to avoid contention that standard `Random` instances can cause in multi-threaded environments.
   *Resource: [Java Concurrency in Practice](https://jcip.net/)*

6. **Clean Architecture Implementation**:
   I separated concerns by introducing a Service layer (`FootballSeasonStatsService`). The Controller now focuses solely on handling HTTP requests and delegating business logic to the Service, following SOLID principles and improving testability and maintainability.
   *Resource: [Spring Framework - Service Layer Pattern](https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html)*

7. **Verification & Observability**:
   I implemented a comprehensive testing harness using `JavaTestRunner` and `evaluation.py`. This setup allows for reproducible baselines (`test-before`) and validation (`test-after`), ensuring that not only strictly verifies the 200ms latency but also checks correctness, sorting, and API contract compliance.
   *Resource: [Observability Engineering](https://www.oreilly.com/library/view/observability-engineering/9781492076438/)*
