# Trajectory: Deterministic Financial Calculator Refactor

This document outlines the engineering process followed to refactor a non-deterministic Go-based calculator into a compliant, deterministic financial tool.

## Analysis: Deconstructing the "Features"
The original calculator (`repository_before/calculator.go`) was intentionally designed with several "features" that introduced non-determinism, making it unsuitable for financial environments:
- **Random Perturbations**: Uses `math/rand` to randomly replace inputs, toggle between math functions (e.g., `sin` vs `cos`), and append characters like `?` to results.
- **Global State Dependency**: Uses global variables like `operationCount` and `memory` to offset current calculations based on previous ones.
- **Time-Based Logic**: Includes logic that triggers changes every few seconds or after a session has lasted for more than 5 minutes.
- **Inconsistent Formatting**: Uses random decimal precision and non-standard symbols based on internal counters.

## Strategy: Choosing Determinism
To meet the 17 strict requirements, the following architectural patterns were chosen:
- **Statelessness**: All global state was removed. The calculation logic now relies exclusively on the provided function name and input values.
- **Pure Functions**: Refactored `handleCalculate` and `parseEquation` into pure functions where the same input always yields the identical output.
- **Elimination of Entropy**: Standardized on predictable Go `math` package calls, removing all imports of `math/rand` and logic involving `time.Now()`.
- **Consistent Precision**: Standardized result formatting using `strconv.FormatFloat` with the `'g'` verb to ensure a clean, consistent numeric representation without artifacts.

## Execution: Step-by-Step Implementation
1. **Audit & Identification**: mapped all 17 requirements to the existing codebase to identify non-compliant blocks.
2. **State Removal**: Stripped the `main` package of all global variables (`memory`, `lastResult`, `operationCount`, etc.) and the `sync.Mutex`.
3. **Logic Cleanup**: Removed all `switch`/`if` blocks involving `rand.Intn` and `time.Now`.
4. **Standardization**:
    - Fixed trigonometric functions to use Radians consistently.
    - Standardized Log bases: `log` for base-10, `ln` for base-e.
    - Implemented explicit "Error" returns for invalid math (e.g., division by zero, square root of negative).
5. **CI/CD Integration**: updated `buildspec.yml` and the Docker setup to automate the comparison of the "before" and "after" implementations.
6. **Verification**: Executed the 550-line Python test suite (`tests/test_requirements.py`) to confirm 100% compliance across all 17 requirements.

## Resources
- [Go math Package Documentation](https://pkg.go.dev/math)
- [IEEE 754 Floating-Point Standard](https://en.wikipedia.org/wiki/IEEE_754)
- [Stateless Web Service Design Patterns](https://en.wikipedia.org/wiki/Stateless_protocol)
- [Go strconv documentation](https://pkg.go.dev/strconv)

