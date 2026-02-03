# Trajectory: TypeScript Sales Discount Calculator Code Refactoring

## 1. Problem Statement

I started by analyzing the problem statement. The original `processAllSales` function in `discountCalculator.ts` had severe code quality issues: 28 code smells including 15 any-type usages, cyclomatic complexity of 24, nested loops 3 levels deep, and callback-style API conflicting with modern async/await standards. The business logic for sales discount calculation needed to remain unchanged, but the code was hard to understand and maintain, leading to production bugs and slow developer onboarding.

The core issues were:
- Lack of type safety with `any` types everywhere
- Monolithic function with high complexity
- Nested loops making the code hard to follow
- Callback-based API instead of modern Promise/async-await
- Hardcoded values scattered throughout
- Poor testability and maintainability

## 2. Requirements

I reviewed the detailed requirements that must be met:

1. Replace all `any` types with proper TypeScript interfaces
2. Refactor into smaller single-responsibility functions
3. Convert callback API to Promise-based async/await
4. Extract hardcoded values into named constants
5. Preserve original lookup behavior exactly
6. Preserve original equality comparison behavior (loose equality)
7. Preserve original rounding behavior
8. Maintain exact output matching
9. Reduce cyclomatic complexity under 10 per function
10. Structure code for testability

## 3. Constraints

The constraints were clear:
- Business logic must remain unchanged (tier discounts, bulk bonus, tax calculation, rounding)
- Output must match original exactly for all inputs
- No external dependencies
- Preserve edge case handling (missing lookups, duplicates, type coercion)
- Maintain backward compatibility

## 4. Research and Resources

I researched TypeScript best practices and refactoring techniques:

- **TypeScript Handbook**: Read about interfaces, union types, and strict typing
  - Link: https://www.typescriptlang.org/docs/handbook/interfaces.html
  - Link: https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html

- **Clean Code principles**: Studied single responsibility principle and function decomposition
  - Link: https://www.oreilly.com/library/view/clean-code/9780136083238/

- **Async/Await patterns**: Researched Promise-based APIs and backward compatibility
  - Link: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function


- **Code complexity metrics**: Understood cyclomatic complexity and how to reduce it
  - Link: https://en.wikipedia.org/wiki/Cyclomatic_complexity

I also analyzed the original code behavior by running it with various inputs to understand edge cases like duplicate keys and type coercion.

## 5. Choosing Methods and Why

I chose the following approach:

- **Interface-based typing**: Because TypeScript interfaces provide compile-time safety and better IDE support compared to `any` types. This eliminates the 15 any-type usages and makes the code self-documenting.

- **Single responsibility functions**: I broke down the monolithic function into pure functions like `getCustomerTier`, `getDiscountRate`, `getTaxRate`, `calculatePrices`, and `roundMonetary`. This reduces complexity from 24 to under 10 per function and eliminates nested loops.

- **Async/await with callback wrapper**: I implemented `processAllSalesAsync` as the primary API returning Promise<ProcessedTransaction[]>, and kept `processAllSales` as a backward-compatible callback wrapper. This modernizes the API while maintaining compatibility.

- **Constants extraction**: I created `DISCOUNT_RATES`, `BULK_BONUS`, and `BULK_THRESHOLD` constants. This makes the code more maintainable and the values easily changeable.

- **Preserved lookup behavior**: I kept the original iteration approach instead of using Maps or find() methods, because the requirement specified that duplicate key behavior must match exactly (last match wins).

- **Loose equality preservation**: I used `==` instead of `===` in lookup functions to maintain type coercion behavior for mixed string/number inputs.

- **Exact rounding**: I implemented `roundMonetary` using `Math.round(value * 100) / 100` to match the original behavior precisely.

## 6. Solution Implementation and Explanation

I implemented the solution step by step:

First, I defined the TypeScript interfaces:
```typescript
interface Transaction {
  order_id: string | number;
  customer_id: string | number;
  product_price: number;
  quantity: number;
  state: string | number;
}
// Similar for Customer, TaxRate, ProcessedTransaction
```

Then I extracted constants:
```typescript
const DISCOUNT_RATES: Record<string, number> = {
  bronze: 0.05,
  silver: 0.10,
  gold: 0.15,
  platinum: 0.20,
};
const BULK_BONUS = 0.05;
const BULK_THRESHOLD = 10;
```

I created pure functions for each responsibility:
- `getCustomerTier`: Iterates through customers, uses loose equality, defaults to 'bronze'
- `getDiscountRate`: Calculates rate based on tier and quantity
- `getTaxRate`: Iterates through taxes, uses loose equality, defaults to 0
- `roundMonetary`: Rounds to 2 decimal places
- `calculatePrices`: Computes all monetary values and rounds them

The main async function processes each transaction sequentially, calling the helper functions.

Finally, I added a callback wrapper for backward compatibility.

## 7. How Solution Handles Constraints, Requirements, and Edge Cases

The solution addresses all requirements and constraints:

- **Type Safety**: Zero `any` types, all interfaces defined with union types for flexible input
- **Complexity**: Each function has complexity under 10, no nested loops
- **API Modernization**: Promise-based primary API with callback compatibility
- **Constants**: All hardcoded values extracted and named descriptively
- **Lookup Behavior**: Exact preservation of iteration order and duplicate handling
- **Equality**: Loose equality (`==`) maintained for type coercion
- **Rounding**: Exact `Math.round(value * 100) / 100` implementation
- **Output Matching**: Row count equals input count, all calculations verified against original
- **Testability**: Pure functions with dependency injection
- **Edge Cases**: Handles missing customer_id (defaults to bronze), missing state (0% tax), duplicate keys (last wins), mixed types (string/number coercion)

The solution produces identical output to the original code for all inputs, including edge cases, while dramatically improving code quality and maintainability.