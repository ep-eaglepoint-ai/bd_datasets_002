# Trajectory: Inventory Reservation PL/pgSQL Function

1. Identify the Core Problem: Race Conditions
   The inventory system must handle concurrent reservations without overselling. Without proper locking, multiple users can reserve the same stock simultaneously (lost update problem).
   Resource: [PostgreSQL Locking Documentation](https://www.postgresql.org/docs/current/explicit-locking.html)

2. Design Atomic Transactions with SELECT FOR UPDATE
   Implemented `SELECT ... FOR UPDATE` to lock product rows during reservations, preventing race conditions while maintaining system throughput.
   Resource: [ACID Properties in PostgreSQL](https://www.postgresql.org/docs/current/transaction-iso.html)

3. Map All Failure Scenarios to Specific Error Codes
   Created comprehensive error handling: PRODUCT_NOT_FOUND, PRODUCT_INACTIVE, INSUFFICIENT_STOCK, DUPLICATE_REQUEST, INVALID_QUANTITY, INVALID_EXPIRATION.
   Resource: [PL/pgSQL Error Handling](https://www.postgresql.org/docs/current/plpgsql-errors-and-messages.html)

4. Optimize Validation Sequence
   Structured checks from cheap to expensive: parameter validation → product existence → stock availability → request uniqueness.

5. Implement Complete Audit Trail
   Added reservation_logs table tracking all attempts (success/failure) for compliance and debugging.

6. Ensure Consistent API Response Format
   Designed return table with: reservation_status, reservation_id, remaining_quantity, error_code, error_message.

7. Result: Thread-Safe Inventory System
   Achieved zero race conditions, clear error handling, full audit trail, and consistent API responses.