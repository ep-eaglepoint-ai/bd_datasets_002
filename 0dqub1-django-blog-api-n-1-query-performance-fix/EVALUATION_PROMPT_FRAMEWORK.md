# Evaluation & Reporting Prompt Framework

> **Purpose**: This document defines a reusable meta-prompt structure for generating evaluation code across any software engineering project. It is designed to verify task completion, produce deterministic signals, and generate structured reports suitable for AI training (SFT/RL), automation, and human review.

---

## Framework Overview

This framework generates evaluation code by combining:
1. **User-provided inputs** (task description, requirements, project structure)
2. **Mandatory evaluation phases** (requirement verification, before/after comparison, signal aggregation)
3. **Report generation requirements** (machine-readable + human-readable outputs)

**OUTPUT REQUIREMENT**: Following this framework, you must create actual evaluation code files in the `evaluation/` folder—not a prompt for building evaluation logic.

The output is **executable evaluation code** (e.g., `evaluation/evaluation.ts`, `evaluation/evaluation.js`, `evaluation/evaluation.py`) that verifies task completion and generates reports.

**Key Distinction**:
- **Tests** → Validate behavior (granular correctness)
- **Evaluation** → Validates completion (holistic intent verification)

---

## PROMPT TEMPLATE

```
You are a senior software engineer specializing in evaluation systems and quality validation. Your task is to design a comprehensive evaluation strategy that verifies task completion and generates structured reports. Your output will be used in automated pipelines and AI training, so evaluation must be deterministic, reproducible, and produce clear pass/fail signals.

=== TASK DESCRIPTION ===
{{TASK_DESCRIPTION}}

=== TASK REQUIREMENTS ===
{{TASK_REQUIREMENTS}}
(List all explicit requirements that must be verified)

=== PROJECT STRUCTURE ===
{{PROJECT_STRUCTURE}}

=== REPOSITORY PATHS ===
- Before: {{REPOSITORY_BEFORE_PATH}}
- After: {{REPOSITORY_AFTER_PATH}}
- Tests: {{TESTS_PATH}}
- Trajectory: {{TRAJECTORY_PATH}}

=== TEST RESULTS PATH (Optional) ===
{{TEST_RESULTS_PATH}}
(Path to existing test results, or "None" if evaluation should run tests)

=== TRAINING REFERENCE PATH (Optional) ===
{{TRAINING_REFERENCE_PATH}}
(Path to training reference PDF/document, or "None" if not provided)

=== TASK CATEGORY ===
{{TASK_CATEGORY}}
(One of: Refactoring, Full-Stack Development, Performance Optimization, Testing, Code Generation, Bug Fix, Feature Implementation, Migration, Integration)

=== TASK MODE ===
{{TASK_MODE}}
(One of: TRANSFORMATION or CREATION)

- **TRANSFORMATION**: Task modifies existing code
  - Has both `repository_before` and `repository_after`
  - Evaluation compares before vs after states
  - Uses FAIL_TO_PASS and PASS_TO_PASS checks

- **CREATION**: Task builds something from scratch
  - Only has `repository_after` (no meaningful before state)
  - Evaluation validates `repository_after` only
  - All checks are requirement-verification checks
  - No before/after comparison

=== LANGUAGE/FRAMEWORK (Optional) ===
{{LANGUAGE_FRAMEWORK}}
(Leave blank if not specified - evaluation design should remain conceptually transferable)

---

## MANDATORY EVALUATION PRINCIPLES

Before designing evaluation logic, understand these core principles:

### Principle 1: Evaluation ≠ Testing
- Tests verify **behavior** (function returns correct value)
- Evaluation verifies **completion** (task requirements are satisfied)
- Evaluation may **consume** test results but should not **duplicate** test logic

### Principle 2: Requirement-Driven
- Every requirement MUST have at least one evaluation check
- No requirement may be left unevaluated
- Evaluation checks trace directly to requirements

### Principle 3: Deterministic Signals
- Every check produces a clear PASS/FAIL signal
- Final verdict is categorical: SUCCESS / FAILURE / PARTIAL
- No probabilistic or ambiguous outcomes
- Same inputs → same outputs (reproducible)

### Principle 4: Before/After Awareness
- `repository_before` = baseline state (problem exists)
- `repository_after` = target state (problem solved)
- Evaluation validates the **transformation**, not just the final state

---

## OUTPUT INSTRUCTIONS

Generate actual evaluation code in the `evaluation/` folder following the **7-Phase Evaluation Structure** below. The evaluation code must:

1. **Map to requirements** (every check traces to a requirement)
2. **Produce deterministic signals** (clear PASS/FAIL)
3. **Support automation** (runnable via CLI/Docker)
4. **Generate reports** (machine + human readable, saved to `evaluation/` folder)
5. **Be executable** via Node.js, Python, or the project's runtime

**IMPORTANT**: The output is actual evaluation code (e.g., `evaluation/evaluation.ts`, `evaluation/evaluation.js`), not a design document.

---

## THE 7-PHASE EVALUATION STRUCTURE

### Phase 1: REQUIREMENT EXTRACTION & CHECK MAPPING
**Guiding Question**: "What specific conditions must be true for this task to be considered complete?"

**Required Elements**:
- Extract every explicit and implicit requirement from the task description
- Create a mapping: Requirement → Evaluation Check(s)
- Classify each requirement:
  - **STRUCTURAL**: Code structure, file presence, pattern presence/absence
  - **BEHAVIORAL**: Test outcomes, runtime behavior
  - **COMPARATIVE**: Before vs After differences
  - **QUALITY**: Code quality, documentation, compliance

**Format**:
```
| Req ID | Requirement Description | Check Type | Check ID(s) |
|--------|-------------------------|------------|-------------|
| REQ-01 | [Description] | STRUCTURAL | CHK-01, CHK-02 |
| REQ-02 | [Description] | BEHAVIORAL | CHK-03 |
| REQ-03 | [Description] | COMPARATIVE | CHK-04 |
```

**Validation**: Every requirement must map to at least one check. Flag any unmapped requirements.

---

### Phase 2: EVALUATION CHECK DESIGN
**Guiding Question**: "How do we verify each requirement is satisfied?"

**Required Elements**:
For each check, define:
- **Check ID**: Unique identifier (CHK-XX)
- **Check Name**: Descriptive name
- **Check Type**: STRUCTURAL / BEHAVIORAL / COMPARATIVE / QUALITY
- **Input**: What is being evaluated (file, test result, comparison)
- **Logic**: How to determine PASS/FAIL
- **Output**: PASS / FAIL + optional message

**Check Type Definitions**:

```
STRUCTURAL CHECKS:
- File/directory existence
- Pattern presence (regex match in code)
- Pattern absence (regex NOT found in code)
- Configuration values
- Dependency declarations

BEHAVIORAL CHECKS:
- Test suite pass/fail status
- Specific test case outcomes
- Runtime behavior verification

COMPARATIVE CHECKS:
- Before vs After file differences
- Added/removed code patterns
- Migrated functionality verification

QUALITY CHECKS:
- Documentation presence
- Code style compliance
- No forbidden patterns (console.log, debug code)
```

**Format per Check**:
```
Check: CHK-XX
Name: [Descriptive name]
Type: [STRUCTURAL | BEHAVIORAL | COMPARATIVE | QUALITY]
Requirement(s): [REQ-XX, REQ-YY]
Input: [What to examine]
Logic:
  - IF [condition] THEN PASS
  - ELSE FAIL with message "[error message]"
Signal: PASS | FAIL
```

---

### Phase 3: BEFORE/AFTER COMPARISON LOGIC
**Guiding Question**:
- **TRANSFORMATION**: "How do we prove the problem existed AND the solution works?"
- **CREATION**: "How do we prove the solution meets all requirements?"

**Required Elements by Task Mode**:

#### TRANSFORMATION MODE:
- Define what should be TRUE in `repository_before` (problem state)
- Define what should be TRUE in `repository_after` (solved state)
- Define what should CHANGE between them

**Comparison Matrix (TRANSFORMATION)**:
```
| Aspect | repository_before | repository_after | Verification |
|--------|-------------------|------------------|--------------|
| [Pattern X] | PRESENT | ABSENT | Removed successfully |
| [Pattern Y] | ABSENT | PRESENT | Added successfully |
| [Feature Z] | BROKEN | WORKING | Fixed successfully |
| [Tests] | FAIL | PASS | Solution verified |
```

---

#### CREATION MODE:
- Define what should be TRUE in `repository_after` (implemented state)
- No `repository_before` comparison needed
- Focus on requirement satisfaction

**Verification Matrix (CREATION)**:
```
| Requirement | repository_after | Verification |
|-------------|------------------|--------------|
| [REQ-01] | IMPLEMENTED | Feature present and working |
| [REQ-02] | IMPLEMENTED | Tests pass |
| [REQ-03] | IMPLEMENTED | Quality checks pass |
```

**Comparison Types**:
- **Presence Comparison**: Pattern exists in after but not before (or vice versa)
- **Value Comparison**: Config/parameter changed from X to Y
- **Test Outcome Comparison**: Test fails on before, passes on after
- **Structural Comparison**: File/directory added, removed, or reorganized

**Validation Logic**:

#### TRANSFORMATION MODE:
```
For FAIL_TO_PASS requirements:
  - Run check on repository_before → EXPECT FAIL
  - Run check on repository_after → EXPECT PASS
  - IF both conditions met → Requirement SATISFIED
  - ELSE → Requirement FAILED

For PASS_TO_PASS requirements (regression):
  - Run check on repository_before → EXPECT PASS
  - Run check on repository_after → EXPECT PASS
  - IF both conditions met → No regression
  - ELSE → Regression detected
```

#### CREATION MODE:
```
For all requirements:
  - Run check on repository_after → EXPECT PASS
  - IF check passes → Requirement SATISFIED
  - ELSE → Requirement FAILED

No repository_before validation needed.
```

---

### Phase 4: SIGNAL AGGREGATION & VERDICT LOGIC
**Guiding Question**: "How do individual check results combine into a final verdict?"

**Required Elements**:
- Define how individual check signals aggregate
- Define final verdict categories
- Define failure handling

**Aggregation Rules**:
```
Signal Aggregation:
- ALL checks PASS → SUCCESS
- ANY check FAIL (critical) → FAILURE
- SOME checks FAIL (non-critical) → PARTIAL (if allowed)

Criticality Classification:
- CRITICAL: Failure = immediate FAILURE verdict
- IMPORTANT: Failure = PARTIAL verdict (if all critical pass)
- INFORMATIONAL: Failure = logged but doesn't affect verdict
```

**Verdict Categories**:
```
SUCCESS:
  - All requirements verified
  - All critical checks pass
  - All important checks pass
  - Exit code: 0

PARTIAL:
  - All critical checks pass
  - Some important checks fail
  - Exit code: 1 (or configurable)

FAILURE:
  - One or more critical checks fail
  - Exit code: 1
```

**Format**:
```
Final Verdict Logic:
  critical_checks = [CHK-01, CHK-03, CHK-05]
  important_checks = [CHK-02, CHK-04]
  informational_checks = [CHK-06]

  IF any(critical_checks) == FAIL:
    verdict = FAILURE
  ELIF any(important_checks) == FAIL:
    verdict = PARTIAL
  ELSE:
    verdict = SUCCESS
```

---

### Phase 5: REPORT SCHEMA DESIGN
**Guiding Question**: "What information must reports contain for machines and humans?"

**Required Elements**:
Two report formats are MANDATORY:
1. **Machine-Readable Report** (JSON/structured)
2. **Human-Readable Report** (text/markdown)

---

#### 5A: MACHINE-READABLE REPORT SCHEMA

```
{
  "metadata": {
    "run_id": "[unique identifier]",
    "started_at": "[ISO 8601 timestamp]",
    "finished_at": "[ISO 8601 timestamp]",
    "duration_seconds": [float],
    "evaluator_version": "[version string]"
  },
  
  "environment": {
    "platform": "[OS platform]",
    "runtime": "[language runtime version]",
    "architecture": "[system architecture]",
    "hostname": "[machine hostname]",
    "git_commit": "[short commit hash]",
    "git_branch": "[branch name]"
  },
  
  "verdict": {
    "status": "SUCCESS | PARTIAL | FAILURE",
    "success": [boolean],
    "error": "[error message or null]"
  },
  
  "requirements": [
    {
      "id": "REQ-XX",
      "description": "[requirement description]",
      "status": "PASS | FAIL",
      "checks": ["CHK-XX", "CHK-YY"]
    }
  ],
  
  "checks": [
    {
      "id": "CHK-XX",
      "name": "[check name]",
      "type": "STRUCTURAL | BEHAVIORAL | COMPARATIVE | QUALITY",
      "requirement_ids": ["REQ-XX"],
      "status": "PASS | FAIL",
      "message": "[result message]",
      "details": {
        // Check-specific details
      }
    }
  ],
  
  "results": {
    "before": {
      "success": [boolean],
      "checks_run": [integer],
      "checks_passed": [integer],
      "checks_failed": [integer]
    },
    "after": {
      "success": [boolean],
      "checks_run": [integer],
      "checks_passed": [integer],
      "checks_failed": [integer]
    },
    "comparison": {
      "requirements_total": [integer],
      "requirements_satisfied": [integer],
      "requirements_failed": [integer],
      "fail_to_pass_verified": [integer],
      "pass_to_pass_verified": [integer],
      "regressions_detected": [integer]
    }
  },
  
  "summary": {
    "total_requirements": [integer],
    "satisfied_requirements": [integer],
    "failed_requirements": [integer],
    "total_checks": [integer],
    "passed_checks": [integer],
    "failed_checks": [integer]
  }
}
```

**Required Fields**: All fields in `metadata`, `verdict`, and `summary` are mandatory.

---

#### 5B: HUMAN-READABLE REPORT FORMAT

```
═══════════════════════════════════════════════════════════════
EVALUATION REPORT: [Task Name]
═══════════════════════════════════════════════════════════════

Run ID: [run_id]
Started: [timestamp]
Duration: [X.XX seconds]

───────────────────────────────────────────────────────────────
VERDICT: [SUCCESS ✅ | PARTIAL ⚠️ | FAILURE ❌]
───────────────────────────────────────────────────────────────

REQUIREMENTS SUMMARY:
  Total: [N]
  Satisfied: [N] ✅
  Failed: [N] ❌

───────────────────────────────────────────────────────────────
REPOSITORY RESULTS
───────────────────────────────────────────────────────────────

Before (repository_before):
  Status: [PASS/FAIL as expected]
  Checks: [N/M] passed

After (repository_after):
  Status: [PASS/FAIL]
  Checks: [N/M] passed

───────────────────────────────────────────────────────────────
REQUIREMENT DETAILS
───────────────────────────────────────────────────────────────

[REQ-01] [Description]
  Status: ✅ SATISFIED
  Checks: CHK-01 ✅, CHK-02 ✅

[REQ-02] [Description]
  Status: ❌ FAILED
  Checks: CHK-03 ❌
  Error: [Failure message]

───────────────────────────────────────────────────────────────
CHECK DETAILS (Failed Only)
───────────────────────────────────────────────────────────────

[CHK-03] [Check Name]
  Type: STRUCTURAL
  Expected: [expected condition]
  Actual: [actual finding]
  Message: [error message]

═══════════════════════════════════════════════════════════════
EVALUATION COMPLETE
═══════════════════════════════════════════════════════════════
Report saved to: [output path]
```

---

### Phase 6: EXECUTION INFRASTRUCTURE
**Guiding Question**: "How will evaluation be executed in automated pipelines?"

**Required Elements**:

#### 6A: CLI Interface Specification

```
Evaluation CLI Requirements:
- Accept repository paths as arguments or environment variables
- Support targeting specific repository (before/after/both)
- Output report to configurable path
- Return appropriate exit codes

Example Invocations:
  # Evaluate repository_after only
  evaluate --after ./repository_after --output ./report.json
  
  # Evaluate both and compare
  evaluate --before ./repository_before --after ./repository_after
  
  # Using environment variables
  REPO_BEFORE=./repository_before REPO_AFTER=./repository_after evaluate
  
  # Specify output format
  evaluate --format json --output ./report.json
  evaluate --format human --output ./report.txt

Exit Codes:
  0 = SUCCESS (all requirements satisfied)
  1 = FAILURE (one or more requirements failed)
  2 = ERROR (evaluation could not complete)
```

#### 6B: Docker Compatibility

```
Docker Requirements:
- Evaluation must run in containerized environment
- No host machine dependencies
- All paths configurable via environment variables
- Report output accessible after container exits

Docker Compose Pattern:
  evaluate:
    build: .
    command: [evaluation command]
    volumes:
      - ./repository_before:/app/repository_before:ro
      - ./repository_after:/app/repository_after:ro
      - ./reports:/app/reports
    environment:
      - REPO_BEFORE=/app/repository_before
      - REPO_AFTER=/app/repository_after
      - OUTPUT_DIR=/app/reports
```

#### 6C: Command Rule Compliance (varies by Task Mode)

**TRANSFORMATION MODE (Three-Command Rule)**:
```
Required Commands:
1. Evaluate repository_before:
   [command to run evaluation on before state]
   
2. Evaluate repository_after:
   [command to run evaluation on after state]
   
3. Full evaluation with comparison:
   [command to run complete evaluation with report generation]
```

**CREATION MODE (Two-Command Rule)**:
```
Required Commands:
1. Evaluate repository_after:
   [command to run evaluation on after state]
   
2. Generate evaluation report:
   [command to generate report]

No repository_before evaluation needed.
```

All commands must be:
- Executable without manual intervention
- Deterministic (same result on repeated runs)
- Documented in README

---

### Phase 7: TRAINING ALIGNMENT & QUALITY ASSURANCE
**Guiding Question**: "How do we ensure evaluation output is suitable for AI training?"

**Required Elements**:

#### 7A: SFT Alignment
- Evaluation logic must be **textbook quality** (clear, idiomatic)
- Report structure must be **consistent** across all evaluations
- Comments/documentation must explain the "why" behind checks

#### 7B: RL Alignment
- Evaluation produces **reward signals**:
  - SUCCESS = +1 (positive reward)
  - FAILURE = -1 (negative reward)
  - PARTIAL = 0 or configurable (neutral/partial reward)
- Signals must be **binary or categorical** (no continuous values)
- No "reward hacking" possible (can't pass without actually solving)

#### 7C: Stability Requirements
```
Stability Checklist:
- [ ] Same inputs → same outputs (deterministic)
- [ ] No reliance on external state (time, network, random)
- [ ] Report structure is stable (no schema drift)
- [ ] Check logic is reproducible across environments
- [ ] Git commit/branch captured for traceability
```

#### 7D: Training PDF Extraction (if provided)
If a training reference document is provided:
- Extract ONLY evaluation-related principles:
  - Signal clarity requirements
  - Reliability standards
  - Consistency expectations
- DO NOT:
  - Summarize entire document
  - Apply non-evaluation sections
  - Quote or reproduce verbatim

---

## INTEGRATION WITH MULTI-AGENT WORKFLOW

This evaluation framework integrates with:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   TRAJECTORY    │────▶│     TESTING     │────▶│   EVALUATION    │
│                 │     │                 │     │                 │
│ - Why decisions │     │ - Prove correct │     │ - Verify done   │
│ - Reasoning     │     │ - Granular      │     │ - Holistic      │
│ - Intent        │     │ - Behavioral    │     │ - Report        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │     REPORTS     │
                                               │                 │
                                               │ - Machine JSON  │
                                               │ - Human Summary │
                                               │ - Training Data │
                                               └─────────────────┘
```

**Data Flow**:
1. **Trajectory** documents reasoning → Evaluation validates intent was achieved
2. **Testing** proves correctness → Evaluation consumes test results
3. **Evaluation** verifies completion → Reports communicate outcomes

**Handoff Points**:
- Evaluation receives: Task requirements, test results, repository paths
- Evaluation produces: Verdict, structured reports, exit code

---

## QUALITY CRITERIA FOR GENERATED EVALUATION PROMPTS

A well-formed evaluation prompt must ensure:
- [ ] Every requirement maps to evaluation check(s)
- [ ] Every check produces PASS/FAIL signal
- [ ] Before/after comparison is explicit
- [ ] Verdict logic is deterministic
- [ ] Machine-readable report follows schema
- [ ] Human-readable report is clear
- [ ] CLI interface is specified
- [ ] Docker compatibility is addressed
- [ ] Exit codes are defined
- [ ] Training alignment is considered

---

## APPENDIX A: REFERENCE IMPLEMENTATION PATTERNS

*Based on evaluation.ts patterns from the reference project:*

### Pattern 1: Run ID Generation
```
Every evaluation run must have a unique identifier:
- Format: Short alphanumeric (e.g., "a1b2c3d4")
- Purpose: Traceability, report linking
- Generated at: Evaluation start
```

### Pattern 2: Environment Capture
```
Capture at evaluation start:
- Runtime version (node, python, etc.)
- Platform (OS type, version)
- Architecture (x64, arm64)
- Hostname
- Git commit (short hash)
- Git branch
```

### Pattern 3: Timestamping
```
Record:
- started_at: ISO 8601 format
- finished_at: ISO 8601 format
- duration_seconds: Float with millisecond precision
```

### Pattern 4: Test Integration
```
When consuming test results:
- Run tests with JSON output flag
- Parse structured results
- Extract per-test outcomes
- Aggregate into summary
- Handle test execution errors gracefully
```

### Pattern 5: Report Output
```
Report file naming:
- Include date: YYYY-MM-DD
- Include time: HH-MM-SS
- Include run_id (optional)
- Example: evaluation/2026-01-21/11-32-39/report.json

Report storage:
- Create directories as needed
- Preserve historical reports
- Make path configurable
```

### Pattern 6: Console Output
```
Human-readable console output:
- Use visual separators (═══, ───)
- Use status indicators (✅, ❌, ⚠️)
- Show progress during evaluation
- Summarize results clearly
- Indicate report save location
```

### Pattern 7: Exit Codes
```
Process exit codes:
- 0: SUCCESS (evaluation passed)
- 1: FAILURE (evaluation failed or tests failed)
- 2: ERROR (evaluation could not run)

Exit with appropriate code after saving report.
```

---

## APPENDIX B: CATEGORY-SPECIFIC EVALUATION FOCUS

### Refactoring
| Aspect | Evaluation Focus |
|--------|-----------------|
| Structural | Pattern removed/added as expected |
| Behavioral | Tests pass on both before and after |
| Comparative | Behavior preserved, structure improved |
| Quality | No debug code, clean implementation |

### Performance Optimization
| Aspect | Evaluation Focus |
|--------|-----------------|
| Structural | Optimized patterns present |
| Behavioral | Performance benchmarks pass |
| Comparative | Measurable improvement metrics |
| Quality | No regression in functionality |

### Bug Fix
| Aspect | Evaluation Focus |
|--------|-----------------|
| Structural | Fix applied in correct location |
| Behavioral | Bug reproduction test passes |
| Comparative | Before: fails, After: passes |
| Quality | No new issues introduced |

### Feature Implementation
| Aspect | Evaluation Focus |
|--------|-----------------|
| Structural | Feature code present |
| Behavioral | Feature tests pass |
| Comparative | Before: feature absent, After: feature works |
| Quality | Documentation, integration points |

### Migration
| Aspect | Evaluation Focus |
|--------|-----------------|
| Structural | Old patterns removed, new patterns present |
| Behavioral | Functionality preserved |
| Comparative | Complete migration verified |
| Quality | No deprecated usage remaining |

---

## APPENDIX C: TRAINING PRINCIPLES ALIGNMENT

*Principles extracted from AI training best practices:*

1. **Clean Reward Signal**: Evaluation output directly maps to training reward
2. **No Reward Hacking**: Cannot game evaluation without solving the problem
3. **Determinism**: Same code → same evaluation → same reward
4. **Traceability**: Every verdict traces to specific requirements and checks
5. **Auditability**: Human can understand why evaluation passed/failed
6. **Stability**: Report schema doesn't change across evaluations
7. **Reproducibility**: Evaluation can be re-run with identical results

---

## USAGE INSTRUCTIONS

1. **Gather inputs**:
   - `{{TASK_DESCRIPTION}}`: Full task description from instance.json
   - `{{TASK_REQUIREMENTS}}`: List of explicit requirements (extract from trajectory or problem statement)
   - `{{PROJECT_STRUCTURE}}`: Directory tree
   - `{{REPOSITORY_BEFORE_PATH}}`: Path to before state (or "None" for CREATION mode)
   - `{{REPOSITORY_AFTER_PATH}}`: Path to after state
   - `{{TESTS_PATH}}`: Path to tests
   - `{{TRAJECTORY_PATH}}`: Path to trajectory.md
   - `{{TEST_RESULTS_PATH}}`: Existing test results or "None"
   - `{{TASK_MODE}}`: TRANSFORMATION or CREATION
   - `{{LANGUAGE_FRAMEWORK}}`: Runtime language (TypeScript, JavaScript, Python)
2. **Analyze the codebase**: Review test files, trajectory, and repository structure
3. **Create evaluation code**: Generate `evaluation/evaluation.ts` (or `.js`/`.py`) implementing the evaluation logic
4. **Create report templates**: Ensure evaluation outputs both JSON and human-readable reports
5. **Verify evaluation runs**: Ensure evaluation is executable via Docker or CLI

**IMPORTANT**: The output of this framework is actual executable evaluation code in the `evaluation/` folder, not a design document or prompt. The evaluation code must:
- Run tests and aggregate results
- Compare repository_before vs repository_after (TRANSFORMATION mode) or validate repository_after only (CREATION mode)
- Generate JSON report (`report.json`) and human-readable output
- Exit with appropriate code (0=SUCCESS, 1=FAILURE)

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Framework creation |

---

**Core Principle**: Evaluation answers the fundamental question: "Is this task complete?" It bridges the gap between granular test correctness and holistic task success, producing the definitive verdict that drives automation, training, and human confidence.
