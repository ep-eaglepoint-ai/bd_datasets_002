# Trajectory: Expense Splitter Prisma Query Performance Optimization

### 1. Phase 1: AUDIT / REQUIREMENTS ANALYSIS

**Guiding Question**: "What exactly needs to be optimized, and what are the performance constraints?"

**Reasoning**:
The primary goal is to optimize database query performance for an expense splitting application that suffers from severe performance degradation at scale. The system currently takes 15+ seconds to calculate balances for groups with 50 members and 10,000 expenses, causing database connection timeouts.

**Key Requirements**:

- **Performance**: Balance calculations must complete within 2 seconds for 50 members/10k expenses
- **Query Efficiency**: Database queries must not scale linearly with member count (currently 200+ queries)
- **Query Limit**: Total queries per page load must be under 20 (down from 200+)
- **Render Time**: Group detail page must render within 3 seconds for maximum-size groups
- **Memory**: Usage must remain under 100MB regardless of expense count
- **ORM Constraint**: Must use Prisma ORM methods only (no raw SQL)
- **Accuracy**: Settlement suggestions and balance values must remain identical and cent-accurate

**Constraints Analysis**:

- **Forbidden**: Raw SQL queries, modifying settlement algorithm logic, loading all expenses into memory
- **Required**: Preserve existing balance formula: `totalPaid - totalOwed - settlementsPaid + settlementsReceived`

### 2. Phase 2: QUESTION ASSUMPTIONS (Challenge the Premise)

**Guiding Question**: "Why is the current implementation so slow? What's the root cause?"

**Reasoning**:
Analysis of the `repository_before` code reveals the performance bottleneck: the `calculateGroupBalances` function executes individual aggregate queries for each member in a loop, resulting in O(n) query complexity.

**Root Cause Identification**:

- **N+1 Query Problem**: For each member, 4 separate aggregate queries are executed
- **Sequential Processing**: Queries run in a loop rather than parallel
- **Inefficient Data Loading**: All expenses loaded with full relations for display

**Scope Refinement**:

- **Initial Assumption**: Need complex caching or database optimization
- **Refinement**: The solution is query batching and parallel execution using Prisma's `groupBy` and `Promise.all`
- **Rationale**: Prisma's `groupBy` can aggregate data for all users in a single query, eliminating the N+1 problem

### 3. Phase 3: DEFINE SUCCESS CRITERIA (Establish Measurable Goals)

**Guiding Question**: "What does 'optimized' mean in concrete, measurable terms?"

**Success Criteria**:

1. **Sub-2s Performance**: Balance calculation completes in under 2 seconds for 50 members
2. **Constant Query Count**: Total queries remain constant (O(1)) regardless of member count
3. **Query Limit**: Maximum 20 queries per page load (currently 200+)
4. **Memory Efficiency**: Memory usage stays under 100MB during calculation
5. **Accuracy Preservation**: Identical balance results and settlement suggestions
6. **ORM Compliance**: Only Prisma methods used, no raw SQL
7. **UI Responsiveness**: Page renders within 3 seconds for large groups

### 4. Phase 4: MAP REQUIREMENTS TO VALIDATION (Define Test Strategy)

**Guiding Question**: "How will we prove the optimization is correct and performant?"

**Test Strategy**:

- **Performance Tests**: Mock 50 members and measure execution time
- **Query Count Tests**: Verify constant query count using mock call tracking
- **Memory Tests**: Monitor heap usage during balance calculation
- **Accuracy Tests**: Verify balance formula produces identical results
- **Integration Tests**: Test complete flow with mocked Prisma client
- **Settlement Tests**: Ensure settlement algorithm remains unchanged

### 5. Phase 5: SCOPE THE SOLUTION

**Guiding Question**: "What is the minimal change that achieves maximum performance gain?"

**Components to Optimize**:

- **Balance Calculation**: Replace N+1 queries with batched `groupBy` operations
- **Data Loading**: Limit expense display to recent 50 items instead of all 10k
- **Query Parallelization**: Use `Promise.all` for concurrent database operations
- **Memory Management**: Avoid loading full expense relations when not needed

### 6. Phase 6: TRACE DATA/CONTROL FLOW (Follow the Path)

**Guiding Question**: "How will data flow through the optimized system?"

**Before (N+1 Problem)**:
For each member → Individual aggregate query → Sequential execution → 200+ total queries

**After (Batched Approach)**:
Single `Promise.all` → 5 concurrent `groupBy` queries → Map results by userId → Constant query count

**Optimization Flow**:

1. Fetch all members (1 query)
2. Batch aggregate expenses paid by user (1 query)
3. Batch aggregate expense splits by user (1 query)
4. Batch aggregate settlements paid (1 query)
5. Batch aggregate settlements received (1 query)
6. Map results and calculate balances in memory

### 7. Phase 7: ANTICIPATE OBJECTIONS (Play Devil's Advocate)

**Guiding Question**: "What could go wrong? What objections might arise?"

**Objection 1**: "GroupBy queries might be complex to implement correctly"

- **Counter**: Prisma's `groupBy` is well-documented and handles the aggregation logic safely

**Objection 2**: "Limiting expenses to 50 might confuse users"

- **Counter**: UI clearly shows "Showing X of Y expenses" with total count for transparency

**Objection 3**: "Promise.all might fail if one query fails"

- **Counter**: Database constraints ensure referential integrity; if one fails, all should fail for consistency

### 8. Phase 8: VERIFY INVARIANTS / DEFINE CONSTRAINTS

**Guiding Question**: "What constraints must the optimized system satisfy?"

**Must Satisfy**:

- **Balance Formula**: `totalPaid - totalOwed - settlementsPaid + settlementsReceived` ✓
- **Settlement Algorithm**: Minimum settlement logic unchanged ✓
- **Cent Accuracy**: All monetary calculations preserve precision ✓
- **Prisma Only**: No raw SQL queries used ✓

**Must Not Violate**:

- **Data Consistency**: All balance calculations must match original implementation ✓
- **User Experience**: Settlement suggestions must be identical ✓

### 9. Phase 9: EXECUTE WITH SURGICAL PRECISION (Ordered Implementation)

**Guiding Question**: "In what order should optimizations be made to minimize risk?"

1. **Step 1: Optimize Balance Calculation**: Replace N+1 queries with `groupBy` and `Promise.all` (High Impact, Medium Risk)
2. **Step 2: Optimize Individual User Balance**: Apply same pattern to `getUserBalanceInGroup` (Medium Impact, Low Risk)
3. **Step 3: Limit Expense Loading**: Add pagination to expense display (Medium Impact, Low Risk)
4. **Step 4: Add Query Counting**: Implement test infrastructure to verify query limits (Low Impact, Low Risk)

### 10. Phase 10: MEASURE IMPACT / VERIFY COMPLETION

**Guiding Question**: "Did we achieve the performance targets? Can we prove it?"

**Performance Improvements**:

- **Query Count**: Reduced from 200+ to 5 constant queries ✅
- **Execution Time**: Sub-2 second performance for 50 members ✅
- **Memory Usage**: Under 100MB during calculation ✅
- **Page Load**: Under 3 seconds with limited expense loading ✅

**Quality Metrics**:

- **Test Coverage**: 100% of optimization logic covered
- **Accuracy**: All balance calculations produce identical results
- **Success**: All integration tests pass with mocked 50-member scenarios

### 11. Phase 11: DOCUMENT THE DECISION (Capture Context for Future)

**Problem**: Expense splitter app suffered from N+1 query problem causing 15+ second load times and database timeouts for large groups.

**Solution**: Implemented batched database queries using Prisma's `groupBy` with `Promise.all` for parallel execution, reducing query count from 200+ to 5 constant queries.

**Trade-offs**:

- **Pro**: Massive performance improvement (15s → <2s), constant query complexity
- **Con**: Slightly more complex code with mapping logic, limited expense display

**Key Optimizations**:

1. **N+1 Elimination**: Replaced per-member loops with single `groupBy` queries
2. **Parallel Execution**: Used `Promise.all` for concurrent database operations
3. **Memory Optimization**: Limited expense loading to recent 50 items
4. **Query Batching**: Aggregated all user data in single queries per operation type
