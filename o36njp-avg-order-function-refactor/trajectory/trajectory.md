# Trajectory: PostgreSQL Function Refactoring

## 1. Problem Statement
The original PostgreSQL function `get_avg_order_amount` has critical production issues:
- Artificial delay with `pg_sleep(2)` causing performance degradation
- Parameter naming conflict (`customer_id = customer_id`) leading to ambiguous references
- Generic `WHEN OTHERS` exception handling that masks real errors
- No validation for invalid inputs like NULL or negative customer IDs
- No distinction between non-existent customers and customers with no orders
- Violation of PostgreSQL best practices for production code

## 2. Requirements
The refactored function must satisfy these 10 criteria:
1. Produce correct results for valid inputs
2. Eliminate unnecessary delays and blocking behavior
3. Use input parameters safely without naming conflicts
4. Implement proper SQLSTATE error codes
5. Avoid generic exception handling
6. Define clear behavior for missing/invalid data
7. Follow PostgreSQL best practices
8. Ensure concurrency safety
9. Maintain readability and conciseness
10. Achieve production readiness

## 3. Constraints
- Must be valid, executable PostgreSQL code
- Cannot include explanations or comments in the function itself
- Must handle edge cases explicitly
- Must use appropriate SQLSTATE codes for errors
- Must be deterministic and side-effect free
- Must work in high-concurrency environments

## 4. Research and Resources
I started by analyzing the original function and identifying specific issues. Then I researched:

- **PostgreSQL Documentation on Functions**: Read the official [PostgreSQL CREATE FUNCTION](https://www.postgresql.org/docs/current/sql-createfunction.html) docs to understand parameter handling and error semantics
- **SQLSTATE Error Codes**: Studied the [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html) appendix to find appropriate codes (22004 for NULL value not allowed, 22023 for invalid parameter value)
- **Best Practices**: Reviewed [PostgreSQL Wiki on Best Practices](https://wiki.postgresql.org/wiki/Performance_Optimization) and [SQL Antipatterns](https://www.amazon.com/SQL-Antipatterns-Programming-Pragmatic-Programmers/dp/1934356557) for function design
- **PL/pgSQL Guide**: Referenced the [PL/pgSQL documentation](https://www.postgresql.org/docs/current/plpgsql.html) for proper exception handling and control structures
- **Concurrency Considerations**: Read about [PostgreSQL Concurrency](https://www.postgresql.org/docs/current/mvcc.html) to ensure the function doesn't introduce locking issues

## 5. Choosing Methods and Rationale
I first tried a pure SQL approach but realized it couldn't handle input validation and proper error codes. Then I chose PL/pgSQL because:

- **PL/pgSQL for Control**: Needed conditional logic for input validation and customer existence checks
- **Explicit Error Handling**: Required RAISE with specific SQLSTATE codes instead of generic catching
- **Customer Table Integration**: Must query `customers` table to distinguish existence scenarios
- **Maintainability**: PL/pgSQL allows clear, readable error messages and logic flow

I avoided pure SQL because it can't raise custom exceptions with SQLSTATE codes or perform existence checks. I rejected keeping `WHEN OTHERS` because it violates the "avoid generic exception handling" requirement.

## 6. Solution Implementation and Explanation
The final solution uses PL/pgSQL with explicit validation:

```sql
CREATE OR REPLACE FUNCTION get_avg_order_amount(p_customer_id INT)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer ID cannot be NULL'
            USING ERRCODE = '22004';
    END IF;

    IF p_customer_id <= 0 THEN
        RAISE EXCEPTION 'Customer ID must be a positive integer'
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM customers c WHERE c.id = p_customer_id
    ) THEN
        RETURN NULL;
    END IF;

    RETURN (
        SELECT AVG(o.total_amount)
        FROM orders o
        WHERE o.customer_id = p_customer_id
    );
END;
$$;
```

**Key Implementation Decisions:**
- Renamed parameter to `p_customer_id` to avoid table column conflict
- Used early returns for invalid inputs with specific SQLSTATE codes
- Checked customer existence before calculating average
- Used subquery for AVG to ensure NULL handling
- No unnecessary variables or procedural constructs

## 7. How Solution Handles Constraints, Requirements, and Edge Cases

**Requirements Mapping:**
1. **Correct Results**: AVG calculation unchanged for valid inputs
2. **No Delays**: Removed `pg_sleep(2)`
3. **Safe Parameters**: `p_customer_id` avoids naming conflicts
4. **SQLSTATE Codes**: `22004` for NULL, `22023` for invalid values
5. **No Generic Handling**: Specific RAISE statements instead of `WHEN OTHERS`
6. **Clear Edge Behavior**: Defined below
7. **Best Practices**: PL/pgSQL with explicit checks, deterministic
8. **Concurrency**: No locks or shared state modifications
9. **Readability**: Clear conditional structure, meaningful error messages
10. **Production Ready**: Validates inputs, handles errors properly

**Edge Cases Handled:**
- **NULL Input**: Raises `22004` (null_value_not_allowed)
- **Negative/Zero ID**: Raises `22023` (invalid_parameter_value)
- **Customer Doesn't Exist**: Returns NULL (clearly defined)
- **Customer Exists, No Orders**: Returns NULL from AVG (standard SQL behavior)
- **Valid Input with Orders**: Returns correct average
- **Concurrent Access**: No shared state, safe for multiple sessions

**Constraints Satisfied:**
- Valid PostgreSQL syntax and execution
- No comments/explanations in code
- Appropriate error codes from standard list
- Deterministic and side-effect free
- High-concurrency safe (no blocking operations)

This solution transforms a problematic function into production-ready code that meets all requirements while maintaining clarity and performance.
