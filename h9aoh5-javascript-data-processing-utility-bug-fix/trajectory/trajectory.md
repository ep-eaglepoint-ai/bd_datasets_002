# Trajectory - JavaScript Data Processing Utility Bug Fix

### Immutability & Deep Copying
- **Link**: [MDN Web Docs - Deep Copy](https://developer.mozilla.org/en-US/docs/Glossary/Deep_copy)
- **What I got**: Deep copies are mandatory when handling nested objects to avoid side effects. Since we aren't using external libraries like Lodash, a recursive implementation (or `structuredClone` in modern Node) is necessary to ensure the source data remains untouched.

### Handling NaN in JavaScript
- **Link**: [MDN Web Docs - Object.is()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is)
- **What I got**: `NaN === NaN` is false in JS. Using `Object.is()` or `Number.isNaN()` is the correct way to identify duplicates when the dataset contains NaN values.

## Implementation Journey

1. **Analysis**: Identified that `splice` in a loop was causing skipped elements and source data corruption.
2. **Refactoring**: 
    - Switched from destructive methods to a "copy-and-collect" strategy for `dedupe`.
    - Implemented a recursive `_deepClone` helper to support absolute immutability for the `merge` and `transform` functions.
    - Standardized date filtering to convert strings to `Date` objects for reliable range comparisons.
3. **Verification**: Developed 12 targeted test cases (one per requirement) and verified they pass in the `repository_after` but fail in `repository_before`.

## Final Result
The library is now fully immutable, handles JavaScript edge cases (NaN, type coercion) correctly, and passes all 12 criteria for production-ready ETL processing.
