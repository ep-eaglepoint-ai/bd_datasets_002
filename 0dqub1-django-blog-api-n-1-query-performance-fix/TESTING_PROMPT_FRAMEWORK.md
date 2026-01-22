# Testing Prompt Framework

> **Purpose**: This document defines a reusable meta-prompt structure for generating test code across any software engineering project. It is designed to produce test suites that serve as high-quality AI training data for Supervised Fine-Tuning (SFT) and Reinforcement Learning (RL).

---

## Framework Overview

This framework generates test code by combining:

1. **User-provided inputs** (task description, project structure, existing tests)
2. **Mandatory review phases** (existing tests audit, training alignment extraction)
3. **Invariant testing principles** (determinism, before/after validation, requirement traceability)

**OUTPUT REQUIREMENT**: Following this framework, you must create actual test code files in the `tests/` folder—not a prompt for designing tests.

The output is **executable test code** that validates the implementation against requirements.

---

## PROMPT TEMPLATE

```
You are a senior software engineer specializing in test design and quality assurance. Your task is to design a comprehensive test strategy and test suite structure for a software engineering task. Your output will be used as AI training data, so tests must be deterministic, evaluable, and produce clear pass/fail signals.

=== TASK DESCRIPTION ===
{{TASK_DESCRIPTION}}

=== PROJECT STRUCTURE ===
{{PROJECT_STRUCTURE}}

=== EXISTING TESTS PATH ===
{{EXISTING_TESTS_PATH}}
(Path to existing tests/ folder, or "None" if no existing tests)

=== TRAINING REFERENCE PATH (Optional) ===
{{TRAINING_REFERENCE_PATH}}
(Path to training reference PDF/document, or "None" if not provided)

=== TASK CATEGORY ===
{{TASK_CATEGORY}}
(One of: Refactoring, Full-Stack Development, Performance Optimization, Testing, Code Generation, Bug Fix, Feature Implementation, Migration, Integration)

=== TASK MODE ===
{{TASK_MODE}}
(One of: TRANSFORMATION or CREATION)

- **TRANSFORMATION**: Task modifies existing code (Refactoring, Bug Fix, Migration, Performance Optimization)
  - Has both `repository_before` and `repository_after`
  - Tests validate both repositories (FAIL_TO_PASS and PASS_TO_PASS)
  - Before/after comparison proves the change worked

- **CREATION**: Task builds something from scratch (Code Generation, New Feature, 0-1 Development)
  - Only has `repository_after` (or minimal/empty scaffold in `repository_before`)
  - Tests ONLY validate `repository_after`
  - All tests are effectively PASS tests (verify implementation meets requirements)
  - No before/after comparison—focus on requirement verification

=== LANGUAGE/FRAMEWORK (Optional) ===
{{LANGUAGE_FRAMEWORK}}
(Leave blank if not specified - test design should remain conceptually transferable)

---

## MANDATORY PRE-DESIGN PHASES

Before designing any new tests, you MUST complete these review phases and document your findings.

### PHASE 0A: EXISTING TESTS AUDIT

If an existing tests/ folder is provided, you MUST:

1. **Inventory existing tests**:
   - List all test files and their purposes
   - Count total test cases
   - Identify test layers (unit / integration / e2e)

2. **Analyze test patterns**:
   - Naming conventions used (e.g., TC-XX, test_xxx, should_xxx)
   - Organization structure (by feature, by file, by layer)
   - Assertion styles and matchers used
   - Setup/teardown patterns
   - Fixture and mock patterns

3. **Evaluate test quality**:
   - Identify coverage gaps (requirements without tests)
   - Flag weak assertions (e.g., `toBeTruthy()` instead of specific checks)
   - Detect anti-patterns:
     - Tests that depend on execution order
     - Tests that rely on external state
     - Non-deterministic tests (time, random, network)
     - Tests that pass for wrong reasons (false positives)
   - Identify redundant tests

4. **Decision matrix**:
   For each identified issue, decide:
   - EXTEND: Add new tests to complement existing ones
   - REFACTOR: Improve existing tests without changing intent
   - REPLACE: Remove and rewrite tests that are fundamentally flawed
   - ADD LAYER: Introduce a new test layer (e.g., add integration tests)

**Document your audit findings in the test design output.**

---

### PHASE 0B: TRAINING ALIGNMENT EXTRACTION

If a training reference document is provided, you MUST:

1. **Extract ONLY testing-related principles**:
   - Test intent clarity requirements
   - Coverage philosophy
   - Evaluation reliability standards
   - Deterministic pass/fail behavior requirements
   - Failure signal quality expectations
   - Meta-testing requirements (if task involves generating tests)

3. **Alignment checklist**:
   - [ ] Tests produce binary pass/fail (no partial credit)
   - [ ] Tests are deterministic (same input → same result)
   - [ ] Tests map 1:1 to requirements
   - [ ] Failure messages are actionable
   - [ ] Tests discriminate between correct and incorrect solutions

**Document extracted principles in the test design output.**

---

## OUTPUT INSTRUCTIONS

Generate actual test code files in the `tests/` folder following the **8-Phase Testing Structure** below. Each test file must:

1. **Include requirement comments** (trace tests to requirements)
2. **Specify test intent** (what behavior is being verified)
3. **Ensure determinism** (no reliance on time, randomness, or external state)
4. **Enable before/after validation** (TRANSFORMATION mode: tests should fail on `repository_before`, pass on `repository_after`; CREATION mode: tests validate `repository_after` only)
5. **Be executable** via the project's test runner (Jest, pytest, etc.)

**IMPORTANT**: The output is actual test code (e.g., `tests/*.test.ts`, `tests/*.test.js`, `tests/test_*.py`), not a design document.

---

## THE 8-PHASE TESTING STRUCTURE

### Phase 1: REQUIREMENT-TO-TEST MAPPING (The Contract)
**Guiding Question**: "Does every requirement have a corresponding test, and does every test trace to a requirement?"

**Required Elements**:
- Explicit mapping: on each test cases you have to put comments that will talk about the requirements and their number
- Identification of test types based on **Task Mode**:

#### TRANSFORMATION MODE:
  - **FAIL_TO_PASS tests**: Tests that MUST fail on `repository_before` and pass on `repository_after`
  - **PASS_TO_PASS tests**: Regression tests that pass on both (prove no breakage)

#### CREATION MODE:
  - **PASS tests**: Tests that verify `repository_after` meets requirements
  - **No FAIL_TO_PASS concept**: There is no meaningful `repository_before` to fail against
  - All tests are requirement-verification tests for the newly created code

- Gap analysis: Any requirements without test coverage?




### Phase 2: TEST CATEGORIZATION (The Layers)
**Guiding Question**: "What types of tests are needed to comprehensively verify the solution?"

**Required Elements**:
- **Structural tests**: Verify code structure, patterns, or architecture (e.g., "class implements interface X")
- **Functional tests**: Verify observable behavior (e.g., "function returns expected output")
- **Regression tests**: Ensure existing functionality is preserved
- **Edge case tests**: Boundary conditions, empty inputs, extreme values
- **Negative tests**: Invalid inputs, error conditions, exception handling

**Category Adaptations**:
- Refactoring → Behavior preservation + structural improvement verification
- Performance → Benchmarks + load tests + complexity verification
- Testing (meta) → Meta-tests that verify generated tests catch bugs
- Bug Fix → Regression test for specific failure + related edge cases
- Feature → Acceptance criteria + integration points

**Principle**: A comprehensive test suite includes both "happy path" and "adversarial" tests.

---

### Phase 3: DETERMINISM ENFORCEMENT (The Invariants)
**Guiding Question**: "Will these tests produce identical results across all executions and environments?"

**Required Elements**:
- **Banned patterns** (must NOT appear in tests):
  - `Date.now()`, `new Date()`, `time.time()` without mocking
  - `Math.random()`, `random.random()` without seeding
  - Network calls to external services
  - File system operations on non-controlled paths
  - Environment-dependent behavior

- **Required patterns**:
  - Fixed seeds for any randomness: `random.seed(42)`, `Math.seedrandom(42)`
  - Mocked time/dates: Use test utilities to freeze time
  - Isolated test data: Fixtures, factories, or inline test data
  - Controlled I/O: Mock file system, mock network
  - the running commands should be docker setup compatible

**Format**:
```

Determinism Checklist:

- [ ] No unseeded randomness
- [ ] No system time dependencies
- [ ] No external network calls
- [ ] No shared mutable state between tests
- [ ] No execution order dependencies
- [ ] All test data is self-contained

```

**Training Alignment**: For AI training, the relationship between prompt and solution must be stable. Non-deterministic tests create noisy gradient updates.

---

### Phase 4: BEFORE/AFTER VALIDATION DESIGN (The Proof)
**Guiding Question**:
- **TRANSFORMATION**: "How do we prove the problem existed AND the solution works?"
- **CREATION**: "How do we prove the solution meets all requirements?"

**Required Elements by Task Mode**:

#### TRANSFORMATION MODE:
- **Execution model**:
  - Tests MUST be executable against both `repository_before` and `repository_after`
  - Repository path MUST be configurable (env var, CLI arg, or config file)


- **Validation logic**:
  - If a FAIL_TO_PASS test passes on `repository_before`, the test is invalid (too weak)
  - If a FAIL_TO_PASS test fails on `repository_after`, the solution is incomplete
  - If a PASS_TO_PASS test fails on `repository_after`, the solution broke something

**Principle**: "Tests must fail on old code and pass on new code to prove the change worked."

---

#### CREATION MODE:
- **Execution model**:
  - Tests are ONLY executed against `repository_after`
  - No `repository_before` validation (there is no meaningful before state)
  - Repository path MUST still be configurable for consistency


- **Validation logic**:
  - If any test fails on `repository_after`, the implementation is incomplete
  - Tests must comprehensively cover all requirements (no gaps)
  - Edge cases and error handling must be verified

**Principle**: "Tests must prove the implementation satisfies all specified requirements."

---

### Phase 5: TEST IMPLEMENTATION PATTERNS (The How)
**Guiding Question**: "How should each test type be implemented for maximum clarity and reliability?"

**Required Elements**:
- **Naming convention**:
  - Pattern: `TC-XX: [Requirement] - [Specific behavior]` or `test_[feature]_[scenario]_[expected]`
  - Names must be self-documenting

- **Assertion specificity**:
  - BAD: `expect(result).toBeTruthy()`
  - GOOD: `expect(result).toEqual({ status: 'success', count: 42 })`

- **Test isolation**:
  - Each test must be independently runnable
  - No shared state between tests
  - Setup/teardown must reset all state

- **Static analysis tests** (for code structure verification):
  - Pattern matching (regex for code patterns)
  - AST analysis (for structural verification)
  - File content inspection (for configuration checks)

**Format**:
```

Test Pattern: [Pattern Name]
When to use: [Scenario]
Structure:

- Setup: [What state to prepare]
- Action: [What operation to perform]
- Assert: [What to verify]
- Teardown: [What to clean up]

```

---

### Phase 6: ADVERSARIAL TEST DESIGN (The Stress)
**Guiding Question**: "How do we catch 'lazy' solutions that pass simple tests but fail in edge cases?"

**Required Elements**:
- **Common AI failure modes to test for**:
  - **Instruction forgetfulness**: Model ignores constraints (e.g., "do not use library X")
  - **Logical shortcuts**: Model uses try-except to hide bugs instead of fixing them
  - **Hardcoded answers**: Model detects example values and returns them as constants
  - **Happy path tunnel vision**: Works for examples, fails for variations

- **Adversarial test strategies**:
  - **Input perturbation**: Slightly modify valid inputs to test robustness
  - **Constraint violation detection**: Tests that verify forbidden patterns are absent
  - **Scale stress**: Inputs large enough to expose inefficient complexity
  - **Boundary probing**: Test at exact limits (0, -1, MAX_INT, empty string)

- **Format**:
```

Adversarial Test: [Name]
Target failure mode: [What lazy behavior we're catching]
Input: [Adversarial input]
Expected behavior: [Correct response]
Why this catches laziness: [Explanation]

```

**Training Alignment**: Adversarial tests ensure the only way for a model to pass is to truly understand and implement the requested logic.

---

### Phase 7: META-TESTING (When Task Is Test Generation) if explicitly asked
**Guiding Question**: "If the task is to generate tests, how do we verify the generated tests are valid?"

**Required Elements** (only if task involves test generation):

- **Requirement Traceability Verification**:
  - Meta-test checks that generated tests cover all requirements
  - Verify 1:1 mapping between prompt constraints and test cases
  - Flag missing coverage

- **Implementation Integrity Checks**:
  - Generated tests are not false positives (passing for wrong reasons)
  - Assertions are specific enough to catch subtle errors
  - Generated tests follow determinism requirements

- **Mutation Testing Concept**:
  - Run generated tests against a known-buggy version
  - If tests pass on buggy code, the tests are invalid
  - Tests must have "killing power" against common bugs

**Format**:
```

Meta-Test: [Name]
Verifies: [What property of generated tests]
Method: [How verification is performed]
Pass criteria: [When meta-test passes]

```

---

### Phase 8: EXECUTION INFRASTRUCTURE (The Runner)
**Guiding Question**: "How will tests be executed in a reproducible, automated manner?"

**Required Elements**:
- **CLI interface**:
  - Tests must accept repository path as argument or env var
  - Example: `REPO_PATH=./repository_before npm test`
  - Example: `pytest tests/ --repo-path=./repository_after`

- **Output format**:
  - Structured output (JSON/XML) for automated parsing
  - Clear pass/fail counts
  - Detailed failure messages with file/line references

- **Docker compatibility** (if applicable):
  - Tests must run in containerized environment
  - No host machine dependencies
  - All dependencies declared in Dockerfile/requirements

- **Command rule compliance** (varies by Task Mode):

  **TRANSFORMATION MODE (Three-command rule)**:
  1. Command to run tests on `repository_before`
  2. Command to run tests on `repository_after`
  3. Command to generate evaluation report

  **CREATION MODE (Two-command rule)**:
  1. Command to run tests on `repository_after`
  2. Command to generate evaluation report
  (No `repository_before` command—there is no before state to test)

**Format**:

#### TRANSFORMATION MODE:
```

Execution Commands:

- Before: [command to run tests on repository_before]
- After: [command to run tests on repository_after]
- Report: [command to generate evaluation report]

```

#### CREATION MODE:
```

Execution Commands:

- After: [command to run tests on repository_after]
- Report: [command to generate evaluation report]

```

**Note**: For CREATION mode, the test runner should skip or gracefully handle attempts to run against `repository_before` if the directory is empty or non-existent.

```

Additional Format:

Environment Variables:

- REPO_PATH: Path to repository under test
- [Other required vars]

Exit Codes:

- 0: All tests passed
- 1: One or more tests failed
- 2: Test execution error

```

---

## ALIGNMENT WITH TRAINING GOALS

### SFT Alignment
- Tests must be **textbook quality** - clear, idiomatic, well-documented
- Test names and assertions should teach the AI what "good testing" looks like
- Comments should explain the "why" behind test design decisions

### RL Alignment
- Tests act as the **Reward Function**: +1 for pass, -1 for fail
- No partial credit - binary pass/fail only
- Tests must prevent "reward hacking" (passing without solving the problem)
- Clear failure signals help the model learn from mistakes

### Evaluability
- Tests must **discriminate** between correct and incorrect solutions
- Tests must be **reproducible** across environments
- Results must be **parseable** for automated evaluation

---

## QUALITY CRITERIA FOR GENERATED TEST PROMPTS

A well-formed testing prompt must ensure:
- [ ] Every requirement maps to at least one test
- [ ] Tests are deterministic (no flakiness)
- [ ] Before/after validation is explicit **(TRANSFORMATION mode only)**
- [ ] Requirement verification is comprehensive **(CREATION mode only)**
- [ ] Adversarial cases are included
- [ ] Naming conventions are consistent
- [ ] Assertions are specific (not generic truthy checks)
- [ ] Test isolation is enforced
- [ ] Execution is reproducible (CLI, Docker)
- [ ] Meta-tests exist (if task is test generation)
- [ ] Output is structured for evaluation
- [ ] Task mode (TRANSFORMATION vs CREATION) is correctly identified

---

## MULTI-AGENT WORKFLOW COMPATIBILITY

This testing framework serves as the **verification layer** for:
- **Trajectory Agent**: Uses Phase 1 (requirement mapping) from trajectory for test design
- **Evaluation Agent**: Consumes Phase 8 (execution output) for scoring
- **Report Agent**: Uses test results to generate quality reports

Each phase is designed to be independently referenceable by downstream agents.

---

## EXISTING TESTS COMPATIBILITY CHECKLIST

When existing tests are present, the generated testing prompt must ensure:
- [ ] New tests follow existing naming conventions (unless explicitly diverging)
- [ ] New tests use same assertion library/style
- [ ] New tests integrate with existing test runner
- [ ] New tests don't duplicate existing coverage
- [ ] Existing tests are validated for before/after correctness
- [ ] Anti-patterns in existing tests are flagged for refactoring
```

---

## USAGE INSTRUCTIONS

1. **Gather inputs**:
   - `{{TASK_DESCRIPTION}}`: The full task description from instance.json or problem statement
   - `{{PROJECT_STRUCTURE}}`: The directory tree or relevant file list
   - `{{EXISTING_TESTS_PATH}}`: Path to existing tests/ folder or "None"
   - `{{TRAINING_REFERENCE_PATH}}`: Path to training PDF or "None"
   - `{{TASK_CATEGORY}}`: Select the appropriate category
   - `{{TASK_MODE}}`: TRANSFORMATION or CREATION
   - `{{LANGUAGE_FRAMEWORK}}`: Specify the test framework (Jest, pytest, etc.)
2. **Analyze the codebase**: Review `repository_before` and `repository_after` (or just `repository_after` for CREATION mode)
3. **Create test files**: Generate actual test code in `tests/` folder (e.g., `tests/[feature].test.ts`)
4. **Create test utilities**: If needed, create helper files (e.g., `tests/utils/loadSource.ts`)
5. **Verify tests run**: Ensure tests are executable with the project's test runner

**IMPORTANT**: The output of this framework is actual executable test code in the `tests/` folder, not a design document or prompt.

---

## APPENDIX A: CATEGORY-SPECIFIC TEST FOCUS

### Task Mode Quick Reference

| Task Category            | Typical Mode               | Before/After Testing |
| ------------------------ | -------------------------- | -------------------- |
| Refactoring              | TRANSFORMATION             | Yes - both repos     |
| Bug Fix                  | TRANSFORMATION             | Yes - both repos     |
| Migration                | TRANSFORMATION             | Yes - both repos     |
| Performance Optimization | TRANSFORMATION             | Yes - both repos     |
| Code Generation          | CREATION                   | No - after only      |
| New Feature (0-1)        | CREATION                   | No - after only      |
| Full-Stack Development   | CREATION or TRANSFORMATION | Depends on context   |
| Feature Implementation   | CREATION or TRANSFORMATION | Depends on context   |

---

### Refactoring (TRANSFORMATION)

| Phase       | Focus                                   |
| ----------- | --------------------------------------- |
| Mapping     | Behavior preservation requirements      |
| Categories  | Structural + functional equivalence     |
| Adversarial | Edge cases that expose broken refactors |
| Execution   | Before/after diff validation            |

### Performance Optimization (TRANSFORMATION)

| Phase       | Focus                                     |
| ----------- | ----------------------------------------- |
| Mapping     | SLO/SLA requirements                      |
| Categories  | Benchmarks, load tests, complexity proofs |
| Adversarial | Large-scale inputs to expose O(n²)        |
| Execution   | Timing thresholds, memory limits          |

### Testing (Meta) (TRANSFORMATION or CREATION)

| Phase       | Focus                                |
| ----------- | ------------------------------------ |
| Mapping     | Generated test coverage requirements |
| Categories  | Meta-tests for generated tests       |
| Adversarial | Buggy code to test "killing power"   |
| Execution   | Mutation testing results             |

### Bug Fix (TRANSFORMATION)

| Phase       | Focus                               |
| ----------- | ----------------------------------- |
| Mapping     | Failure reproduction requirement    |
| Categories  | Regression + related edge cases     |
| Adversarial | Similar bugs in related code        |
| Execution   | Before: fails on bug, After: passes |

### Feature Implementation (CREATION or TRANSFORMATION)

| Phase       | Focus                              |
| ----------- | ---------------------------------- |
| Mapping     | Acceptance criteria                |
| Categories  | Unit + integration + e2e           |
| Adversarial | Feature edge cases, invalid inputs |
| Execution   | Feature flags, rollback testing    |

### Code Generation (CREATION)

| Phase       | Focus                                   |
| ----------- | --------------------------------------- |
| Mapping     | Input/output specs, constraints         |
| Categories  | Correctness + style + completeness      |
| Adversarial | Edge inputs, constraint violations      |
| Execution   | After-only validation (no before state) |

---

## APPENDIX B: TESTING PRINCIPLES FROM TRAINING ALIGNMENT

_These principles are extracted from AI training best practices and should guide test design:_

1. **Tests as Reward Function**: In RL, tests determine if a model's solution is rewarded or penalized. Weak tests allow "reward hacking."

2. **Clean Signal**: A "pass" must mean ALL requirements are met, not just functional correctness.

3. **Determinism**: Non-deterministic tests create noisy training signals and poor model convergence.

4. **Requirement Traceability**: Every constraint in the prompt must have a test anchor.

5. **Adversarial Robustness**: Tests must catch lazy shortcuts (instruction forgetfulness, hardcoded answers, logical shortcuts).

6. **Meta-Testing**: When the model generates tests, those tests must be validated against known-buggy code.

7. **Bit-Level Reproducibility**: Tests must produce identical results across environments (Docker, local, CI).

8. **Binary Outcomes**: No partial credit—tests produce definitive pass/fail signals.

---

## VERSION HISTORY

| Version | Date    | Changes            |
| ------- | ------- | ------------------ |
| 1.0     | Initial | Framework creation |

---

**Core Principle**: Tests are not just verification—they are the **curriculum** that teaches the AI what "correct" means. Your tests define the graduation exam.
