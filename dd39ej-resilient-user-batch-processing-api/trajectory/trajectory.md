# Trajectory

## Analysis: Problem Deconstruction

The core issue was identified from the problem statement: **The user batch processing API fails to meet business requirements because it aborts the entire batch when encountering a single invalid user record, preventing valid users from being processed, obscuring error visibility, and reducing system reliability when handling mixed-quality input data.**

### Key Requirements Extracted:
1. **Resilient Processing**: Continue processing valid users even when invalid ones are encountered
2. **Error Reporting**: Provide detailed information about invalid users without stopping execution
3. **Data Integrity**: Maintain proper validation while allowing partial success
4. **Business Continuity**: Ensure system reliability with mixed-quality input data

### Original Implementation Problems:
- Used `throw new IllegalArgumentException()` which aborted entire batch processing
- Only validated email format, ignored ID validation
- No error reporting mechanism for invalid records
- All-or-nothing approach prevented partial success scenarios

## Strategy: Resilient Batch Processing Pattern

### Chosen Approach: **Collect-and-Continue Pattern**
Instead of fail-fast validation, implemented a collect-and-continue strategy that:

1. **Separates Validation from Processing**: Created dedicated `ValidationResult` class to encapsulate validation logic
2. **Dual-Track Processing**: Maintains separate collections for valid and invalid users
3. **Comprehensive Error Reporting**: Captures detailed error information without stopping execution
4. **Duplicate Handling**: Prevents duplicate error reporting for users with same ID

### Algorithm Design Decisions:

**Validation Strategy:**
- ID validation: Reject null, empty, or whitespace-only IDs
- Email validation: Maintain existing "@" symbol requirement
- Fail gracefully: Return validation results instead of throwing exceptions

**Data Structure Choices:**
- `LinkedHashMap` for response: Preserves insertion order for consistent API responses
- `ArrayList` for collections: Maintains processing order
- Separate tracking list for reported invalid IDs to handle duplicates

**Deduplication Logic:**
- Track already-reported invalid user IDs to avoid duplicate error entries
- Only report first occurrence of invalid user with specific ID
- Handle edge cases where ID might be null or empty

## Execution: Step-by-Step Implementation

### Phase 1: Core Structure Transformation
1. **Replaced Exception-Based Validation**:
   ```java
   // Before: throw new IllegalArgumentException("Invalid email: " + user.getEmail());
   // After: ValidationResult validation = validateUser(user);
   ```

2. **Introduced ValidationResult Class**:
   - Encapsulates validation state and error reason
   - Enables non-blocking validation flow
   - Provides structured error information

### Phase 2: Dual-Track Processing Logic
1. **Implemented Separate Processing Paths**:
   - Valid users → Add to `processedIds` list
   - Invalid users → Add to `invalidUsers` list with detailed error info

2. **Enhanced Response Structure**:
   ```java
   response.put("processedCount", processedIds.size());
   response.put("processedIds", processedIds);
   response.put("invalidCount", invalidUsers.size());
   response.put("invalidUsers", invalidUsers);
   ```

### Phase 3: Advanced Error Handling
1. **Duplicate Prevention Mechanism**:
   - Maintain `reportedInvalidIds` tracking list
   - Check for existing entries before adding to invalid users
   - Handle null/empty ID edge cases

2. **Comprehensive Validation Rules**:
   - ID validation: `user.getId() == null || user.getId().trim().isEmpty()`
   - Email validation: `user.getEmail() == null || !user.getEmail().contains("@")`
   - Structured error reasons: "null or empty id" vs "invalid email"

### Phase 4: Data Integrity Enhancements
1. **Order Preservation**:
   - Used `LinkedHashMap` for consistent response ordering
   - Maintained processing sequence in all collections

2. **Enhanced User Class**:
   - Added constructors for easier testing
   - Added setters for complete POJO functionality
   - Made class public for external access

### Test Coverage Achievements:
- **21 FAIL_TO_PASS tests**: All critical resilience and error handling scenarios
- **3 PASS_TO_PASS tests**: Maintained existing functionality for valid cases
- **Edge cases**: Empty lists, all-valid, all-invalid scenarios
- **Integration tests**: Complex mixed data processing

### Key Implementation Insights:
1. **No Streams Used**: Deliberately avoided Java 8 streams to meet test requirements
2. **Manual Loop Processing**: Used traditional for-loops for explicit control
3. **Separated Validation Logic**: Clean separation of concerns between validation and processing
4. **Comprehensive Error Details**: Each invalid user entry includes ID, email, and specific reason

The implementation successfully transforms a brittle, all-or-nothing API into a resilient batch processor that handles mixed-quality data gracefully while providing comprehensive error reporting and maintaining data integrity.

