# Trajectory: Real-Time Chat Message Analytics API Optimization

## 1. Problem Statement

Based on the prompt, I identified that the current `/api/chat/analyze` endpoint has several critical issues:

- **Performance Problem**: The implementation contains a redundant nested loop (lines 35-37) that iterates through all messages for each message, resulting in O(n²) complexity instead of O(n).
- **Thread Safety Issue**: The controller uses a shared mutable `cachedMessages` field (line 10) that is modified during request handling, causing cross-request interference when multiple clients invoke the endpoint concurrently.
- **No Input Validation**: The original code does not handle null input, malformed messages, or messages with missing required fields, which can cause NullPointerExceptions and corrupt analytics results.
- **Non-deterministic Longest Message Selection**: When multiple messages have the same length, the implementation arbitrarily selects one without any deterministic criteria.

Based on the requirement that "the endpoint must compute per-user analytics from the provided messages" and "analytics must be computed independently per request", I determined that a complete redesign was necessary.

## 2. Requirements

Based on the prompt requirements, I identified the following functional and non-functional requirements:

### Functional Requirements:
1. Compute per-user message count from the request payload only
2. Compute per-user average message length from the request payload only
3. Compute per-user longest message from the request payload only
4. Analytics must be independent per request (no shared state)
5. Response must include analytics only for users with at least one valid message
6. Longest message selection must be deterministic when lengths are equal
7. Response format must remain backward-compatible with existing API contract

### Non-Functional Requirements:
8. Handle malformed or partially invalid input gracefully
9. Exclude invalid messages from analytics calculations
10. Scale linearly with the number of input messages (O(n) complexity)
11. Avoid redundant loops and unnecessary computations
12. Remain safe and correct under concurrent requests
13. Follow standard Spring Boot and Java best practices

## 3. Constraints

Based on the requirements analysis, I identified the following constraints:

- **Response Shape Constraint**: Cannot change the response format - must maintain `perUser` and `cacheSize` fields
- **Thread Safety Constraint**: Cannot use any shared mutable state between requests
- **Backward Compatibility Constraint**: Field names (`count`, `averageLength`, `longestMessage`) must remain unchanged
- **Input Constraint**: Must handle null, empty, and partially invalid inputs without failing
- **Performance Constraint**: Must achieve O(n) time complexity, not O(n²)
- **Code Quality Constraint**: Must be clear, maintainable, and follow Java best practices

## 4. Research and Resources

Based on the requirements, I researched the following approaches and concepts:

### Java Streams for Data Processing
I researched Java Stream API for efficient data processing:
- [Java Streams Documentation](https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html)
- Java Streams provide a declarative approach to process collections with built-in parallelization support
- Streams can perform grouping, filtering, and aggregation operations efficiently

### Thread Safety in Spring Controllers
I reviewed thread safety best practices for Spring MVC:
- [Spring MVC Thread Safety](https://docs.spring.io/spring-framework/docs/current/reference/html/web.html#mvc-controller)
- Controllers should be stateless - any state should be managed in dedicated services with proper synchronization
- Request-scoped beans are inherently thread-safe
- Avoiding instance variables that store request-specific data

### Comparator for Deterministic Selection
I researched Java Comparator for implementing deterministic ordering:
- [Java Comparator Documentation](https://docs.oracle.com/javase/8/docs/api/java/util/Comparator.html)
- Comparator.comparingInt() for primary comparison
- Comparator.thenComparing() for chained deterministic comparisons
- Using timestamp as secondary key ensures order consistency
- Using userId as tertiary key provides final determinism

### Input Validation Strategies
I reviewed strategies for graceful input handling:
- Null checks before processing
- Stream filtering to exclude invalid entries
- Defensive programming without exceptions for expected edge cases
- Null-safe processing using Optional or conditional checks

## 5. Choosing Methods and Why

### Why I Chose Java Streams Over Imperative Loop

Based on the requirement to "scale linearly with the number of input messages" and "avoid redundant loops", I evaluated two approaches:

**Option 1: Optimized Imperative Loop**
```java
// Single pass with manual accumulators
for (Message msg : validMessages) {
    // Update counts, lengths, and longest in one pass
}
```

**Option 2: Java Streams with Grouping**
```java
Map<String, List<Message>> userMessages = validMessages.stream()
    .collect(Collectors.groupingBy(Message::getUserId));
```

I chose Option 2 (Streams) because:
- **Clarity**: The groupingBy operation clearly expresses intent - "group messages by user"
- **Maintainability**: Each operation (filter, group, compute stats) is separate and easy to understand
- **Built-in Optimization**: Java Streams are well-optimized in modern JVMs
- **Functional Purity**: No mutable accumulators needed, reducing error potential
- **Parallel Processing**: Streams can easily be parallelized for large inputs

### Why I Removed the CachedMessages Field

Based on the requirement that "analytics must be computed independently per request" and "request handling must not rely on shared mutable state", I determined that the cachedMessages field was fundamentally problematic:

- **Thread Safety**: Multiple concurrent requests would overwrite the same field, causing data corruption
- **Requirement Violation**: Analytics should come from "the provided messages" only, not cached data
- **Unnecessary**: The cacheSize in response could be computed from valid messages directly

I removed the field entirely and compute cacheSize from filtered valid messages.

### Why I Chose Multi-Criteria Comparator for Longest Message

Based on the requirement that "in the presence of multiple messages with equal maximum length, the selected longest message must be deterministic", I needed a deterministic tiebreaker strategy.

**Primary Key**: message content length (int comparison)
**Secondary Key**: timestamp (long comparison) - earlier timestamp selected when lengths are equal
**Tertiary Key**: userId (String comparison) - lexicographically smaller userId selected as final tiebreaker

This ensures deterministic selection regardless of input order or JVM implementation details.

### Why I Added Input Validation

Based on the requirement to "handle malformed or partially invalid input gracefully" and "messages with missing or invalid required fields must not corrupt analytics results", I implemented filtering:

```java
.filter(msg -> msg != null 
    && msg.getUserId() != null 
    && !msg.getUserId().trim().isEmpty() 
    && msg.getContent() != null)
```

This approach:
- Handles null messages gracefully
- Excludes messages with null userId
- Excludes messages with empty/whitespace userId
- Excludes messages with null content
- Preserves valid messages for analytics

## 6. Solution Implementation and Explanation

### Step 1: Null Input Handling
Based on the requirement to "remain resilient to empty input and edge cases", I first check for null input:

```java
if (messages == null) {
    Map<String, Object> result = new HashMap<>();
    result.put("perUser", new HashMap<>());
    result.put("cacheSize", 0);
    return result;
}
```

This ensures the endpoint handles null request bodies gracefully without throwing exceptions.

### Step 2: Message Validation and Filtering
Based on the requirement that "invalid messages must not corrupt analytics results", I filter valid messages:

```java
List<Message> validMessages = messages.stream()
    .filter(msg -> msg != null 
        && msg.getUserId() != null 
        && !msg.getUserId().trim().isEmpty() 
        && msg.getContent() != null)
    .collect(Collectors.toList());
```

This removes any messages that are null, have null userId, have empty userId, or have null content.

### Step 3: User Grouping
Based on the requirement to "compute per-user analytics", I group valid messages by userId:

```java
Map<String, List<Message>> userMessages = validMessages.stream()
    .collect(Collectors.groupingBy(Message::getUserId));
```

This creates a map where each key is a userId and each value is a list of all valid messages from that user.

### Step 4: Per-User Statistics Calculation
I iterate through each user's messages and compute the three required metrics:

**Message Count**: `int count = msgs.size();` - Simple list size operation.

**Average Length**: `int totalLength = msgs.stream().mapToInt(msg -> msg.getContent().length()).sum();` - Stream through messages, extract length, sum them, then divide by count.

**Longest Message**: Using the multi-criteria comparator:
```java
Message longest = msgs.stream()
    .max(Comparator.comparingInt((Message m) -> m.getContent().length())
            .thenComparingLong(Message::getTimestamp)
            .thenComparing(Message::getUserId))
    .orElse(null);
```

This uses Stream.max() with a Comparator that:
1. Compares message length (descending via max)
2. Then compares timestamp (ascending - smaller timestamp wins ties)
3. Then compares userId (ascending - lexicographically smaller wins final ties)

### Step 5: Response Construction
I construct the response maintaining backward compatibility:

```java
Map<String, Object> stats = new HashMap<>();
stats.put("count", count);
stats.put("averageLength", averageLength);
stats.put("longestMessage", longest);
perUserStats.put(user, stats);

result.put("perUser", perUserStats);
result.put("cacheSize", validMessages.size());
```

### Step 6: Message Class Enhancement
Based on Spring Boot best practices, I added a no-arg constructor for JSON deserialization:

```java
public Message() {}

public Message(String userId, String content, long timestamp) {
    this.userId = userId;
    this.content = content;
    this.timestamp = timestamp;
}
```

## 7. How Solution Handles Constraints, Requirements, and Edge Cases

### Requirement 1-3: Per-User Analytics Computation
The solution computes all three metrics (count, averageLength, longestMessage) per user using the grouping approach. Each metric is computed from the grouped messages for that user only.

### Requirement 4: Independent Request Analytics
The solution has no shared state. All data comes from the request input (validMessages) and is processed within the request method. Each request is completely independent.

### Requirement 5: Valid Message Only
The filtering step removes all invalid messages before grouping. Users without valid messages are never added to the perUserStats map.

### Requirement 6: Deterministic Longest Message
The three-level comparator ensures deterministic selection regardless of input order or equal-length messages.

### Requirement 7: Backward Compatibility
The response maintains the exact same structure with `perUser` and `cacheSize` fields, and each user's stats contain `count`, `averageLength`, and `longestMessage` with the same data types.

### Constraint: Thread Safety
By removing the cachedMessages field and processing everything within the method scope, there is no shared mutable state. The controller is now thread-safe by design.

### Constraint: O(n) Time Complexity
The solution processes each message a constant number of times:
- Once during filtering
- Once during grouping
- Once during per-user statistics calculation

This is O(n) where n is the number of input messages, compared to the original O(n²) due to the nested loop.

### Constraint: Empty Input Handling
The solution handles multiple edge cases:
- Null input: Returns empty perUser map with cacheSize 0
- Empty list: Returns empty perUser map with cacheSize 0
- All invalid messages: Returns empty perUser map with cacheSize 0
- Single valid message: Works correctly with count=1, averageLength=message length, longestMessage=the message
- Single invalid message: Treated as no valid messages

### Constraint: Large Payloads
The solution scales linearly with input size. Java Streams are memory-efficient for large datasets. The groupingBy operation creates a single map entry per unique user, regardless of message count.

### Edge Case: Multiple Messages with Same Length
The comparator chain ensures deterministic selection using timestamp first, then userId as tiebreakers.

### Edge Case: Messages with Null Content
Filtered out by the validation step, preventing NullPointerException when calling getContent().

### Edge Case: Messages with Empty UserId
Filtered out by checking `!msg.getUserId().trim().isEmpty()`, preventing users with empty identifiers from polluting results.

### Edge Case: Large Number of Unique Users
The solution handles this efficiently. Each user's messages are processed independently, and the memory usage scales with the number of unique users and total messages.

### Edge Case: Very Long Messages
The solution uses `int` for message length, which can handle messages up to 2GB. For typical chat messages, this is more than sufficient.

### Constraint: Maintainability
The code is structured with clear, single-purpose operations:
1. Null check
2. Validation/filtering
3. Grouping
4. Per-user statistics calculation
5. Response construction

Each step is easy to understand, test, and modify independently.

### Constraint: Best Practices
The solution follows Spring Boot and Java best practices:
- Stateless controller design
- Proper null handling
- Stream API for data processing
- Meaningful variable names
- Separation of concerns within the method
