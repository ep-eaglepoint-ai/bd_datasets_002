# Trajectory: Real-Time Chat Message Analytics API

## 1. Problem Statement

The original `/api/chat/analyze` endpoint in the Spring Boot REST API was inefficient, not thread-safe, and failed to handle malformed input properly. It performed unnecessary computations, relied on shared mutable state, and could produce incorrect results under concurrent requests or with invalid data. The goal was to optimize and harden this endpoint without changing the response format, ensuring correct, scalable, and safe analytics computation.

## 2. Requirements

- Compute per-user message count, average length, and longest message from request payload only.
- Ensure independence per request, no shared state.
- Preserve response format and field names.
- Handle empty, null, or invalid input gracefully.
- Exclude invalid messages from calculations.
- Select longest message deterministically on equal lengths.
- Scale linearly with input size.
- Avoid redundant work.
- Be thread-safe for concurrent requests.
- Follow Spring Boot and Java best practices.

## 3. Constraints

- No changes to response shape.
- Must handle edge cases like empty lists, null inputs, invalid messages.
- Linear scalability required.
- Thread-safety essential.
- Maintainability and clarity prioritized over micro-optimizations.

## 4. Research

I researched Java performance optimization, thread-safety in Spring Boot, and stream API best practices.

- **Java Streams Documentation**: https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html - Learned about Collectors.groupingBy and max with comparators for efficient aggregation.
- **Spring Boot Thread Safety**: https://docs.spring.io/spring-framework/docs/current/reference/html/web.html#mvc-controller - Understood that controllers are singleton by default, so avoided instance variables.
- **Effective Java by Joshua Bloch**: https://www.amazon.com/Effective-Java-Joshua-Bloch/dp/0134685997 - Reviewed best practices for collections, null handling, and performance.
- **Baeldung Articles**: https://www.baeldung.com/java-streams - Explored stream operations for data processing.
- **Stack Overflow Threads**: Searched for "thread-safe Spring controllers" and "deterministic max in Java streams" - Confirmed that stateless methods are thread-safe.

I chose streams because they provide declarative, efficient processing without manual loops, and groupingBy for O(n) aggregation.

## 5. Choosing Methods and Why

I analyzed the original code: it used nested loops (O(n^2)), shared mutable state (cachedMessages), and didn't handle nulls or invalid data.

I chose:
- **Streams and Collectors**: For linear-time processing and grouping, replacing manual loops.
- **Stateless Implementation**: Removed instance variables to ensure thread-safety.
- **Filtering and Validation**: To exclude invalid messages gracefully.
- **Comparator with thenComparing**: For deterministic longest message selection.

This works because streams leverage internal iteration for better performance, groupingBy creates maps efficiently, and stateless design avoids concurrency issues.

## 6. Solution Implementation and Explanation

I started by reading the original code and identifying issues: redundant loop, shared state, no null checks.

Then, I implemented filtering for valid messages using streams.

Next, I used Collectors.groupingBy to group messages by userId.

For each user, I calculated count, total length, and longest message using streams.

For longest message, I used max with comparator on length, then timestamp reversed for determinism.

I handled null input by checking early.

CacheSize was set to messages.size() to match original behavior.

I tested incrementally: first basic functionality, then edge cases, then performance.

The solution uses functional programming with streams for clarity and efficiency.

## 7. How Solution Handles Constraints, Requirements, and Edge Cases

- **Independence per Request**: No instance variables, all computation from input.
- **Response Preservation**: Same structure and field names.
- **Invalid Input Handling**: Filters out null or invalid messages, handles null lists.
- **Deterministic Longest**: Comparator ensures consistent selection.
- **Linear Scalability**: O(n) time with streams.
- **No Redundant Work**: Single pass grouping.
- **Thread-Safety**: Stateless, no shared state.
- **Edge Cases**: Empty lists return empty perUser, single messages work, large payloads processed efficiently.
- **Best Practices**: Clear, readable code with streams and standard Java APIs.

This ensures correctness, performance, and maintainability.
