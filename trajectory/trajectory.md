# Trajectory: Production-Grade Validation Test Suite

This document outlines the engineering process followed to implement the `Validate` function and its comprehensive test suite.

## 🔍 Analysis
The objective was to create a production-grade validation system in Go that is deterministic, exhaustive, and follows senior-level engineering standards. Key requirements identified:
- **Exhaustive Testing**: Coverage for boundary conditions, edge cases, and normalization side effects.
- **Mode Logic**: Distinct behavior for `Strict` (rejects all) vs. `Lenient` (suppresses exactly one `ErrTooShort`).
- **Control Flow**: `FailFast` support and deterministic error precedence (first error wins).
- **Time Dependency**: Decoupling from the system clock using a `Clock` interface.
- **Standard Library ONLY**: No external packages for assertions or mocking.

## 🎯 Strategy
1.  **Table-Driven Testing**: Chosen as the primary pattern to ensure clean, DRY (Don't Repeat Yourself) code while allowing for dozens of varied test cases.
2.  **Dependency Injection (DI)**: Using a `Clock` interface allows for precise testing of "Business Hours" logic at critical boundaries (9:00, 17:00, and +/- 1 minute) using a `FakeClock`.
3.  **Error Composition**: Leveraging `errors.Is` for assertions to support robust error checking that isn't dependent on volatile string messages.
4.  **Interface-Based Design**: Implementing the `Clock` interface ensures the production code uses `RealClock` by default but remains testable.

## ⚙️ Execution
1.  **Infrastructure Setup**: Created the project structure and defined core types (`Policy`, `Mode`, `Clock`).
2.  **Validation Implementation**: Developed the `Validate` function with a focus on normalization order (normalization happens *before* length and content checks).
3.  **Test Suite Development**:
    *   Crafted table entries for all `MinLength` boundaries.
    *   Implemented XSS and SQL detection test cases.
    *   Wrote specific cases to verify `Lenient` mode's single-error suppression logic.
    *   Added `FailFast` verification to prove early exit.
4.  **Verification & Evaluation**:
    *   Validated the suite using `go test -v`.
    *   Integrated an evaluation script (`evaluation.py`) to systematically compare the "Before" vs "After" behavior.
5.  **Documentation**: Finalized README and Trajectory logs to ensure the engineering rationale is transparent.

## 📚 Resources
- [Go Testing Package Documentation](https://pkg.go.dev/testing)
- [Go Table-Driven Tests Wiki](https://github.com/golang/go/wiki/TableDrivenTests)
- [Effective Go: Errors](https://golang.org/doc/effective_go#errors)
- [Go Interface Guidelines](https://github.com/golang/go/wiki/CodeReviewComments#interfaces)
