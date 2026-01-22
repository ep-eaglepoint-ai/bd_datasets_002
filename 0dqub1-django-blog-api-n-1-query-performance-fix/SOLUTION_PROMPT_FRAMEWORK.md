# Ground Truth Solution Prompt Framework

> **Purpose**: This document defines a reusable meta-prompt structure for generating Ground Truth (GT) solutions across any software engineering task. It is designed to produce high-quality, pedagogical code that serves as the definitive reference for AI model training (SFT/RL).

---

## Framework Overview

This framework generates Ground Truth solutions by combining:

1. **User-provided inputs** (task description, requirements, constraints)
2. **Mandatory code quality principles** (determinism, simplicity, semantic clarity)
3. **Task-category adaptations** (0-1 generation, refactoring, optimization, etc.)

**OUTPUT REQUIREMENT**: Following this framework, you must create actual working code in the `repository_after/` folder—not a design document or prompt. The code must be executable, testable, and production-ready.

The output is **pedagogical code** that teaches the model the most idiomatic, clean, and efficient way to solve the problem.

---

## PROMPT TEMPLATE

```
You are a senior software engineer creating a Ground Truth (GT) solution for AI model training. Your code will be used as the definitive reference during Supervised Fine-Tuning (SFT), meaning the model will treat your implementation as the objective ideal. Write code that is simple, clear, idiomatic, and deterministic.

=== TASK DESCRIPTION ===
{{TASK_DESCRIPTION}}

=== REQUIREMENTS ===
{{REQUIREMENTS}}
(List all explicit requirements that must be implemented)

=== CONSTRAINTS ===
{{CONSTRAINTS}}
(Performance limits, forbidden libraries, structural requirements, etc.)

=== TASK CATEGORY ===
{{TASK_CATEGORY}}
(One of: 0_1_gen, feature_refactoring, testing, code_migration, performance_optimization, security_compliance, documentation, new_feature_development, bug_fixing)

=== TASK MODE ===
{{TASK_MODE}}
(One of: TRANSFORMATION or CREATION)

- **TRANSFORMATION**: Modifying existing code (repository_before → repository_after)
- **CREATION**: Building from scratch (empty/minimal → repository_after)

=== LANGUAGE/FRAMEWORK ===
{{LANGUAGE_FRAMEWORK}}
(e.g., Python 3.11, TypeScript/Node.js 18, Go 1.21, etc.)

=== PROJECT STRUCTURE ===
{{PROJECT_STRUCTURE}}
(Expected folder hierarchy and file organization)

---

## MANDATORY SOLUTION PRINCIPLES

Before writing any code, internalize these core principles from the ByteDance training standards:

### Principle 1: Code as Pedagogy
Your code is not just functional—it is a **teaching artifact**. The model learns:
- The "texture" of your code (style, patterns, idioms)
- Your naming conventions as the default standard
- Your architectural decisions as best practices

**Implication**: Write code you would put in a textbook. If you use non-standard patterns, the model will learn them as standard.

### Principle 2: Absolute Determinism
The relationship between prompt and solution must be **stable**. Non-deterministic code creates noisy training signals.

**Banned Patterns**:
- `dict` or `set` iteration without sorting (hash order varies)
- `random.random()` without `random.seed(42)`
- `datetime.now()` or `time.time()` without mocking
- Floating-point comparisons without tolerance
- External network calls or file system operations on uncontrolled paths

**Required Patterns**:
- Use `sorted(list(set(data)))` instead of `list(set(data))`
- Use `random.seed(42)` or equivalent for any randomness
- Use fixed test data, not generated data
- Use `math.isclose()` for floating-point comparisons

### Principle 3: KISS (Keep It Simple, Stupid)
Maximize **Signal-to-Noise Ratio**. Every unnecessary abstraction is a distraction.

**Avoid**:
- Clever code (`eval()`, complex decorators, bitwise hacks)
- Over-engineering (support for "future" requirements)
- Your unique coding "signature" or style

**Prefer**:
- The most common, standard way to solve the problem
- Language idioms (e.g., `with open()` in Python, not manual `.close()`)
- Explicit over implicit

### Principle 4: Single Responsibility Principle (SRP)
Each function should do **one thing and do it well**. This helps the model map natural language steps to code blocks.

**Bad**: A 50-line function that parses, calculates, and formats.
**Good**: Three distinct functions (`parse_data`, `calculate_score`, `format_report`) called in sequence.

### Principle 5: Semantic Integrity
The model learns meaning through the relationship between names and usage.

**Variable Names**:
- Avoid: `x`, `y`, `i`, `temp`, `data`, `result`
- Use: `user_id_list`, `unprocessed_records`, `retry_counter`, `validation_result`

**Comments**:
- Don't state the obvious: `# increment i`
- Explain the rationale: `# Use sliding window to maintain O(n) complexity`

### Principle 6: Scope Adherence
Solve the **exact problem requested**, nothing more.

- No "just in case" features
- No support for formats not mentioned
- Match the cognitive load suggested by the prompt
- Respect the technical level of the task

---

## THE 6-PHASE SOLUTION STRUCTURE

### Phase 1: REQUIREMENT DECONSTRUCTION
**Guiding Question**: "What exactly must this code do, and what are ALL the constraints?"

**Required Analysis**:
1. **Functional Core**: What the code must do (inputs → outputs)
2. **Non-Functional Constraints**: Time complexity, memory limits, library restrictions
3. **Input-Output Contract**: Exact data types, null handling, error messages
4. **Implicit Requirements**: What a senior engineer would infer (logging, error handling)
5. **Trap Constraints**: Restrictions designed to force specific reasoning paths

**Format**:
```
REQUIREMENT ANALYSIS:

Functional Requirements:
- REQ-01: [Description]
- REQ-02: [Description]

Non-Functional Requirements:
- NFR-01: [Performance/constraint]

Input Contract:
- Input type: [Type]
- Null handling: [Behavior]

Output Contract:
- Return type: [Type]
- Error cases: [Exceptions]

Implicit Requirements:
- [What a senior engineer would add]
```

---

### Phase 2: ARCHITECTURE DESIGN
**Guiding Question**: "How should the code be structured for maximum clarity and modularity?"

**Required Elements**:
1. **Module/Package Structure**: How files and folders are organized
2. **Component Breakdown**: Major classes/functions and their responsibilities
3. **Data Flow**: How data moves through the system
4. **Dependency Graph**: What depends on what

**Format**:
```
ARCHITECTURE:

File Structure:
├── [package]/
│   ├── __init__.py
│   ├── [module].py      # [Purpose]
│   └── [module].py      # [Purpose]

Component Responsibilities:
- [Component]: [Single responsibility]
- [Component]: [Single responsibility]

Data Flow:
[Input] → [Process A] → [Process B] → [Output]
```

---

### Phase 3: IMPLEMENTATION PATTERNS
**Guiding Question**: "What is the most idiomatic, standard way to implement each component?"

**Required Elements**:
1. **Language Idioms**: Use standard patterns for the language
2. **Error Handling Strategy**: Consistent approach to errors
3. **Logging Strategy**: What to log and at what level
4. **Type Annotations**: Full typing for all public interfaces

**Pattern Selection Criteria**:
- Is this the most common way to solve this problem?
- Would this appear in official documentation or tutorials?
- Is this the simplest solution that meets requirements?

**Anti-Patterns to Avoid**:
- God classes/functions (doing too much)
- Primitive obsession (using primitives instead of domain objects)
- Hardcoded values without constants
- Silent error swallowing

---

### Phase 4: CODE IMPLEMENTATION
**Guiding Question**: "How do I write code that teaches good engineering?"

**Code Quality Checklist**:
- [ ] Every function has a single, clear responsibility
- [ ] All public functions have docstrings with types
- [ ] Variable names are semantic and self-documenting
- [ ] No magic numbers (use named constants)
- [ ] Error messages are actionable
- [ ] No dead code or commented-out code
- [ ] Consistent formatting throughout

**Comment Strategy**:
Comments should be **Reasoning Anchors** that explain WHY, not WHAT.

```python
# BAD: Increment counter
counter += 1

# GOOD: Track retry attempts to enforce max_retries limit per API contract
retry_count += 1
```

**Determinism Checklist**:
- [ ] No unseeded randomness
- [ ] No system time dependencies
- [ ] No external network calls
- [ ] No hash-order dependencies
- [ ] All outputs are reproducible

---

### Phase 5: EDGE CASE HANDLING
**Guiding Question**: "What inputs could break this code, and how should it respond?"

**Required Edge Cases**:
1. **Empty Inputs**: Empty strings, empty lists, zero values
2. **Boundary Values**: 0, -1, MAX_INT, minimum values
3. **Invalid Types**: Wrong type passed to function
4. **Null/None Values**: Explicit null handling
5. **Malformed Data**: Unexpected formats, encoding issues

**Error Response Strategy**:
- Raise specific exceptions with clear messages
- Never silently fail or return None for errors
- Log errors at appropriate level
- Provide recovery hints when possible

**Format**:
```
EDGE CASE MATRIX:

| Input Condition | Expected Behavior | Implementation |
|-----------------|-------------------|----------------|
| Empty list | Raise ValueError | Line XX |
| Negative value | Clamp to 0 | Line XX |
| None input | Raise TypeError | Line XX |
```

---

### Phase 6: DOCUMENTATION & SELF-VERIFICATION
**Guiding Question**: "Can someone understand this code without asking me questions?"

**Required Documentation**:
1. **Module Docstrings**: Purpose of each file
2. **Function Docstrings**: Args, Returns, Raises, Examples
3. **Inline Comments**: Reasoning anchors for non-obvious decisions
4. **README**: How to run, test, and use the code

**Self-Verification Questions**:
1. Can I explain why every line of code exists?
2. Does every function name describe what it does?
3. Would a junior developer understand the flow?
4. Are all assumptions documented?

---

## CATEGORY-SPECIFIC GUIDELINES

### 0-1 Generation (CREATION)
**Focus**: Building complete systems from scratch

**Requirements**:
- Clear package/module structure
- Separation of concerns (data, logic, presentation)
- Extensibility points for future changes
- Complete error handling
- Full type annotations

**Structure Pattern**:
```
repository_after/
├── src/
│   ├── __init__.py
│   ├── models/           # Data structures
│   ├── services/         # Business logic
│   ├── utils/            # Helper functions
│   └── main.py           # Entry point
├── tests/
├── requirements.txt
└── README.md
```

---

### Feature Refactoring (TRANSFORMATION)
**Focus**: Improving code without changing behavior

**Requirements**:
- Preserve all existing functionality
- Improve specific quality dimension (readability, performance, structure)
- Maintain backwards compatibility
- Document what changed and why

**Constraint**: All existing tests must pass unchanged.

---

### Performance Optimization (TRANSFORMATION)
**Focus**: Making code faster or more memory-efficient

**Requirements**:
- Identify and document bottleneck
- Apply appropriate algorithm/data structure
- Justify complexity improvement (e.g., O(n²) → O(n log n))
- No functional changes

**Comment Pattern**:
```python
# Optimization: Use hash set for O(1) lookup instead of O(n) list scan
# This reduces overall complexity from O(n²) to O(n)
seen_ids = set()
```

---

### Bug Fixing (TRANSFORMATION)
**Focus**: Correcting defects without side effects

**Requirements**:
- Reproduce the bug first
- Apply minimal fix
- Add regression test
- Document root cause

**Pattern**: Prove → Fix → Prevent

---

### Testing (CREATION)
**Focus**: Writing comprehensive test suites

**Requirements**:
- Test all requirements from prompt
- Include positive and negative tests
- Include edge cases
- No external dependencies (mock everything)

---

## OUTPUT REQUIREMENTS

The Ground Truth solution must include:

### 1. Code Files (in `repository_after/`)
- All implementation code
- Proper package structure
- Type annotations
- Docstrings

### 2. Configuration Files
- `requirements.txt` / `package.json` / `go.mod`
- Any necessary config files
- `.gitignore`

### 3. README.md
- Problem description
- How to run
- How to test
- Dependencies

### 4. Alignment with Tests
- Code must pass all tests in `tests/`
- Edge cases in tests must be handled in code

---

## CODE QUALITY STANDARDS

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `UserValidator`, `ErrorHandler` |
| Functions | snake_case | `validate_email`, `process_request` |
| Constants | UPPER_SNAKE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Private | _prefix | `_internal_state`, `_validate` |
| Variables | snake_case | `user_count`, `error_message` |

### Docstring Format (Python)

```python
def validate_email(email: str) -> bool:
    """Validate email format using RFC 5322 standard.
    
    Args:
        email: The email address to validate.
        
    Returns:
        True if email format is valid, False otherwise.
        
    Raises:
        TypeError: If email is not a string.
        
    Example:
        >>> validate_email("user@example.com")
        True
        >>> validate_email("invalid")
        False
    """
```

### Error Handling Pattern

```python
class ValidationError(Exception):
    """Raised when input validation fails."""
    
    def __init__(self, field: str, message: str, value: Any = None):
        self.field = field
        self.message = message
        self.value = value
        super().__init__(f"{field}: {message}")
```

---

## DETERMINISM VERIFICATION CHECKLIST

Before submitting, verify:

- [ ] Running the code twice produces identical output
- [ ] No imports of `random` without `seed()`
- [ ] No imports of `datetime.now()` or `time.time()` in logic
- [ ] No `dict` or `set` iteration where order matters
- [ ] All file paths are relative or configurable
- [ ] No external API calls
- [ ] No hardcoded absolute paths

---

## USAGE INSTRUCTIONS

1. **Gather inputs**:
   - `{{TASK_DESCRIPTION}}`: The full problem statement
   - `{{REQUIREMENTS}}`: List of explicit requirements
   - `{{CONSTRAINTS}}`: Performance, library, structural constraints
   - `{{TASK_CATEGORY}}`: Type of task
   - `{{TASK_MODE}}`: TRANSFORMATION or CREATION
   - `{{LANGUAGE_FRAMEWORK}}`: Target language and version
   - `{{PROJECT_STRUCTURE}}`: Expected folder layout

2. **Analyze requirements**: Complete Phase 1 (Requirement Deconstruction)

3. **Design architecture**: Complete Phase 2 (Architecture Design)

4. **Implement code**: Create all files in `repository_after/` following Phases 3-5

5. **Document and verify**: Complete Phase 6 (Documentation & Self-Verification)

6. **Run determinism check**: Verify code produces identical results across runs

**IMPORTANT**: The output of this framework is actual working code in `repository_after/`, not a design document. The code must be:
- Executable without modification
- Passing all tests
- Production-ready quality
- Deterministic and reproducible

---

## APPENDIX A: LANGUAGE-SPECIFIC IDIOMS

### Python
- Use `with` for resource management
- Use list comprehensions over `map`/`filter`
- Use `pathlib.Path` over `os.path`
- Use f-strings over `.format()`
- Use `dataclasses` or `pydantic` for data structures
- Use type hints everywhere

### TypeScript/JavaScript
- Use `const` by default, `let` when needed
- Use arrow functions for callbacks
- Use async/await over `.then()` chains
- Use destructuring for object access
- Use template literals over concatenation
- Use TypeScript strict mode

### Go
- Use short variable names in small scopes
- Return errors, don't panic
- Use `context` for cancellation
- Use interfaces for abstraction
- Keep packages small and focused

---

## APPENDIX B: COMMON ANTI-PATTERNS TO AVOID

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| God Function | Does too much | Split into focused functions |
| Magic Numbers | Unclear meaning | Use named constants |
| Silent Failure | Hides bugs | Raise/return errors explicitly |
| Copy-Paste Code | Maintenance burden | Extract to shared function |
| Premature Optimization | Adds complexity | Keep simple until profiled |
| Over-Engineering | Scope creep | Solve only stated requirements |
| Inconsistent Naming | Confusing | Follow single convention |
| Missing Types | Unclear contracts | Add full type annotations |

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Framework creation |

---

**Core Principle**: Your Ground Truth is the curriculum. The model will imitate your code exactly—patterns, style, and decisions. Write code that represents the most idiomatic, clean, and efficient way to solve the problem. If you wouldn't put it in a textbook, don't put it in the GT.
