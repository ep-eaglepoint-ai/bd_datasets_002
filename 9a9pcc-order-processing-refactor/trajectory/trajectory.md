1. Audit the Original Code (Identify Debt):
   I audited the original `OrderProcessor`. It was plagued by primitive obsession (floats for money, dicts for addresses), deeply nested if-else chains for discounts and shipping, and duplicate logic across methods. Generic exceptions provided no context for failures.

2. Introduce Money Value Object:
   I introduced a `Money` value object using `decimal.Decimal` to handle currency operations safely. This prevents floating-point precision issues and centralizes rounding logic (Banker's rounding).
   Learn why you shouldn't use floats for money: [https://youtu.be/P-v82O6Oid0](https://youtu.be/P-v82O6Oid0)

3. Extract Strategy Interface for Discounts:
   The complex discount logic was refactored using the Strategy Pattern. I created a `DiscountStrategy` interface, allowing for clean implementations of `TierBasedDiscount` and `PromoCodeDiscount`.
   Design Patterns: Strategy Pattern explained: [https://youtu.be/v9ejT8FO-7I](https://youtu.be/v9ejT8FO-7I)

4. Implement Polymorphic Discount Selection:
   Instead of nested conditionals, the `OrderProcessor` now iterates through a list of strategies and automatically selects the highest (best) discount for the customer.

5. Encapulate Shipping Logic:
   The duplicate and fragile shipping cost calculation was extracted into a dedicated `ShippingCalculator`. This class handles country-specific rules and free-shipping triggers independently.

6. Centralize Tax Calculation:
   Taxes are now handled by a `TaxCalculator`, which maps states to rates. This makes the system easier to update as tax laws change without touching the core processing logic.

7. Introduce Custom Exception Hierarchy:
   Generic `Exception` calls were replaced with domain-specific exceptions like `InsufficientInventoryError` and `InvalidOrderError`. These provide specific error messages and contextual data (like product IDs).

8. Use Address and Status Value Objects:
   Raw strings and dictionaries were replaced with `Address` dataclasses and `OrderStatus` enums. This adds validation at the point of creation rather than deep inside the processing logic.

9. Apply Guard Clauses and Early Returns:
   I refactored the main `process_order` method to use guard clauses. This "flattened" the code, making it significantly more readable by handling error cases first.
   Learn about Guard Clauses: [https://youtu.be/2NXqwBQ6K8E](https://youtu.be/2NXqwBQ6K8E)

10. Result: Maintainable and Testable Architecture:
    The resulting system is modular. Each component (discounts, shipping, taxes, validation) can be tested and versioned independently while preserving the exact bit-for-bit output of the original implementation.
