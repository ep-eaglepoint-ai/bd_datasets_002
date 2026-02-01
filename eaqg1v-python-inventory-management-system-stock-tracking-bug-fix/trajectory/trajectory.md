# Trajectory

I analyzed the inventory management system and identified several critical bugs that were causing incorrect stock levels, financial discrepancies, and data corruption. Here's what I found and how I fixed each issue.

1. Audit the Original Code (Identify Stock Validation Problems):

   I audited the original code and found that the `remove_stock` method had a fundamental flaw: it decremented the stock quantity first, then checked if it went negative and capped it to zero. This meant that attempting to remove more stock than available would still return `True` and reduce stock to zero, rather than rejecting the operation.

   I fixed this by validating the available quantity before any modification. Now, if there's insufficient stock, the method returns `False` immediately and leaves the stock unchanged. This ensures that stock levels can never go negative and operations only succeed when they're actually valid.

2. Fix Floating Point Precision for Financial Accuracy

   The system was using `float` for monetary calculations, which caused rounding errors. For example, adding 1000 items at $0.10 each might result in $99.99999 or $100.00001 instead of exactly $100.00. These small discrepancies accumulate over time, causing financial reconciliation issues.

   I replaced all monetary calculations with Python's `Decimal` type, which provides exact decimal arithmetic. The `Product` class now stores prices as `Decimal`, and `get_total_value` returns a `Decimal` quantized to cents. This ensures all financial calculations are mathematically accurate.

3. Correct Reorder Threshold Logic

   The `check_reorder` method had two problems: it used `<` (less than) instead of `<=` (less than or equal), and it returned only the first matching item instead of all items that need reordering.

   I changed the comparison to `<=` so alerts trigger when stock reaches the threshold, not just when it goes below. I also fixed the early return bug so it now collects and returns all products that are at or below their reorder threshold.

4. Eliminate Transaction Object Reuse Bug

   The transaction logging system was reusing a single `Transaction` object, modifying it for each new transaction and appending the same object reference to the list. This meant that modifying any transaction in the history would corrupt all transactions, since they all referenced the same object.

   I fixed this by creating a new `Transaction` instance for each log entry. Each transaction is now an independent object, ensuring the transaction history remains immutable and audit-compliant.

5. Normalize SKU Lookups for Consistency

   SKU lookups were case-sensitive and didn't handle whitespace, causing "SKU-001", "sku-001", and " SKU-001 " to be treated as different products. This led to intermittent lookup failures.

   I implemented SKU normalization that strips whitespace and converts to uppercase. All SKU inputs are normalized before any lookup or storage operation, ensuring consistent matching regardless of input format.

6. Add Thread Synchronization for Concurrency Safety

   The system had no thread synchronization, meaning concurrent operations from multiple warehouse workers could cause data loss. For example, two workers simultaneously adding stock to the same item might result in only one addition being recorded.

   I added a reentrant lock (`threading.RLock`) to protect all stock operations. All methods that read or modify stock now acquire the lock, ensuring thread-safe concurrent access. This prevents data loss and ensures all operations are properly serialized.

7. Make Bulk Operations Atomic

   The `bulk_remove` method applied removals one by one, so if one removal failed partway through, some items would already be removed while others weren't, leaving the system in an inconsistent partial state.

   I made bulk operations atomic by validating all removals first (checking that all SKUs exist and have sufficient stock), and only applying changes if all validations pass. If any validation fails, no changes are made at all, ensuring the system always remains in a consistent state.

8. Add Input Validation for Quantity Operations

   The system accepted negative numbers and non-integer values for quantities, which could lead to unexpected behavior. There was no validation to ensure quantities were positive integers.

   I added validation that checks quantity types and values at the start of `add_stock` and `remove_stock`. Invalid inputs (non-integers, negative numbers, or zero for operations that require positive quantities) now raise `ValueError` with clear error messages.

9. Handle Empty Inventory Edge Cases

   The `get_total_value` method could potentially raise errors or return unexpected values for empty inventory.

   I ensured it returns `Decimal("0.00")` for empty inventory, providing a safe default value.

10. Fix Transaction Timestamp Accuracy

    Transaction timestamps were being set when the transaction was added to the log, not when the transaction object was created. This could cause timing discrepancies if there was a delay between creation and logging.

    I moved timestamp creation to the `Transaction` dataclass using `field(default_factory=datetime.now)`, so the timestamp is set at object creation time, accurately reflecting when the transaction occurred.

These fixes ensure the inventory system is mathematically correct, thread-safe, and maintains data integrity under all conditions, including high-concurrency scenarios with multiple warehouse workers updating inventory simultaneously.
