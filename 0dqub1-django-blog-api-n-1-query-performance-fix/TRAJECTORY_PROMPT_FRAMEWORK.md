# Trajectory Prompt Framework

> **Purpose**: This document defines a reusable meta-prompt structure for generating `trajectory.md` files across any software engineering task. It is designed to produce high-quality AI training data suitable for Supervised Fine-Tuning (SFT) and Reinforcement Learning (RL).

---

## Framework Overview

This framework generates trajectory prompts by combining:

1. **User-provided inputs** (task description, project structure)
2. **Invariant reasoning phases** (the constant structure)
3. **Task-category adaptations** (variable focus per category)

**OUTPUT REQUIREMENT**: Following this framework, you must create an actual `trajectory/trajectory.md` file containing the complete reasoning trace—not a prompt for generating one.

The output trajectory is a **curated professional reasoning trace**, not raw chain-of-thought.

---

## PROMPT TEMPLATE

```
You are a senior software engineer documenting your reasoning process for a software engineering task. Your output will be used as AI training data, so it must expose high-level reasoning, decision-making, and essential steps clearly.

=== TASK DESCRIPTION ===
{{TASK_DESCRIPTION}}

=== PROJECT STRUCTURE ===
{{PROJECT_STRUCTURE}}

=== TASK CATEGORY ===
{{TASK_CATEGORY}}
(One of: Refactoring, Full-Stack Development, Performance Optimization, Testing, Code Generation, Bug Fix, Feature Implementation, Migration, Integration)

=== TASK MODE ===
{{TASK_MODE}}
(One of: TRANSFORMATION or CREATION)

- **TRANSFORMATION**: Task modifies existing code (Refactoring, Bug Fix, Migration, Performance Optimization)
  - Has both `repository_before` and `repository_after`
  - Trajectory describes problems in current implementation and improvements
  - Uses Before/After comparisons

- **CREATION**: Task builds something from scratch (Code Generation, New Feature, 0-1 Development)
  - Only has `repository_after` (or minimal scaffold in `repository_before`)
  - Trajectory describes WHAT is being built and WHY
  - Uses Requirements → Design → Implementation flow
  - No "problems with previous implementation" (there is none)

=== LANGUAGE/FRAMEWORK (Optional) ===
{{LANGUAGE_FRAMEWORK}}
(Leave blank if not specified - the trajectory should remain conceptually transferable)

---

## OUTPUT INSTRUCTIONS

Generate a `trajectory.md` file following the **11-Phase Reasoning Structure** below. Each phase must:

1. **State the guiding question** for that phase
2. **Document the reasoning process** (not just the outcome)
3. **Explain WHY decisions were made**, not just WHAT was done
4. **Include external references** when introducing novel concepts, APIs, or patterns
5. **Remain technology-agnostic** in structure while being specific in implementation(no code examples needed) details

---

## THE 11-PHASE REASONING STRUCTURE

### Phase 1: AUDIT / REQUIREMENTS ANALYSIS

**Mode-Specific Guiding Questions**:
- **TRANSFORMATION**: "What is the actual problem, not just the symptom?"
- **CREATION**: "What exactly needs to be built, and what are the constraints?"

---

#### TRANSFORMATION MODE (Refactoring, Bug Fix, Migration, Performance)

**Required Elements**:
- Initial observations about the current state
- Identification of root causes vs. surface issues
- Recognition of anti-patterns, violations, or inefficiencies
- Clear articulation of **why** this is problematic (scalability, security, maintainability, correctness)

**Category Adaptations**:
- Refactoring → Code/architecture audit
- Performance Optimization → Runtime profiling & bottleneck detection
- Bug Fix → Failure mode analysis & reproduction
- Migration → Compatibility & dependency audit

---

#### CREATION MODE (Code Generation, New Feature, 0-1 Development)

**Required Elements**:
- Comprehensive requirements extraction from task description
- Identification of explicit vs. implicit requirements
- Constraints analysis (technical, business, performance)
- Integration points with existing systems (if any)
- Clear articulation of **what** needs to exist when done

**Category Adaptations**:
- Code Generation → Input/output specification, constraints, edge cases
- New Feature → User stories, acceptance criteria, integration points
- 0-1 Development → Full system requirements, architecture decisions
- Full-Stack Development → API contracts, UI requirements, data models

**Key Difference**: Instead of "what's wrong with current code", document "what must the new code accomplish".

---

**External References**: Include links when the analysis reveals patterns, APIs, or architectural decisions that benefit from external explanation.

---

### Phase 2: QUESTION ASSUMPTIONS (Challenge the Premise)
**Guiding Question**: "Why are we doing this? Is this the right approach?"

---

#### TRANSFORMATION MODE

**Required Elements**:
- Explicit challenge to the initial assumption
- Exploration of alternative framings of the problem
- Identification of unnecessary constraints or inherited decisions
- Recognition of pre-existing solutions (dependencies, platform features)

**Key Insight Pattern**:
```
- Original thinking: "[What was assumed about the problem]"
- Reality: "[What is actually true]"
- Conclusion: "[The reframed understanding]"
```

---

#### CREATION MODE

**Required Elements**:
- Challenge to scope assumptions ("Do we really need all of this?")
- Exploration of alternative approaches ("Is there a simpler way?")
- Recognition of existing solutions ("Does a library/framework already do this?")
- Identification of over-engineering risks

**Key Insight Pattern**:
```
- Initial scope: "[What was initially requested]"
- Refined scope: "[What actually needs to be built]"
- Rationale: "[Why this scope is appropriate]"
```

---

**Lesson Documentation**: Capture transferable lessons (e.g., "Always check if your dependencies already solve your problem before building custom solutions.")

---

### Phase 3: DEFINE SUCCESS CRITERIA (Establish Measurable Goals)

**Mode-Specific Guiding Questions**:
- **TRANSFORMATION**: "What does 'better' mean in concrete, measurable terms?"
- **CREATION**: "What does 'done' mean in concrete, measurable terms?"

---

#### TRANSFORMATION MODE

**Required Elements**:
- Before/After comparisons for each improvement dimension
- Quantifiable metrics where possible
- Clear categories: Security, Complexity, Maintainability, Performance, User Experience, Correctness

**Format**:
```
**[Dimension]**:
- Before: [Current state with specific issues]
- After: [Target state with specific improvements]
```

---

#### CREATION MODE

**Required Elements**:
- Acceptance criteria for each requirement
- Quantifiable metrics where possible
- Clear categories: Functionality, Performance, Usability, Maintainability, Correctness

**Format**:
```
**[Requirement]**:
- Acceptance Criteria: [Specific conditions that must be true]
- Measurable Target: [Quantifiable goal if applicable]
- Verification Method: [How we'll prove it's met]
```

**Note**: No "Before" state exists—focus on what the final state MUST achieve.

---

**Mental Checkpoint**: 
- TRANSFORMATION: "If I cannot measure the improvement, I am not solving the problem."
- CREATION: "If I cannot define what 'done' looks like, I cannot build it correctly."

---

### Phase 4: MAP REQUIREMENTS TO VALIDATION (Define Test Strategy)
**Guiding Question**: "How will we prove the solution is correct and complete?"

---

#### TRANSFORMATION MODE

**Required Elements**:
- Requirement-to-test-case traceability matrix
- Test categories: Structural tests, Functional tests, Regression tests
- Expected behavior: Old code should fail, new code should pass (FAIL_TO_PASS)
- Regression tests: Must pass on both old and new code (PASS_TO_PASS)

**Category Adaptations**:
- Refactoring → Behavior preservation tests
- Performance → Benchmarks, load tests, metrics comparison
- Bug Fix → Regression test for the specific failure
- Migration → Compatibility tests, data integrity checks

**Mental Checkpoint**: "Tests must fail on old code and pass on new code to prove the change worked."

---

#### CREATION MODE

**Required Elements**:
- Requirement-to-test-case traceability matrix
- Test categories: Unit tests, Integration tests, Acceptance tests
- Expected behavior: All tests pass on final implementation
- Edge case coverage: Boundary conditions, error handling

**Category Adaptations**:
- Code Generation → Output validation, style checks, correctness proofs
- New Feature → Acceptance criteria validation, user flow tests
- 0-1 Development → Full test pyramid (unit → integration → e2e)

**Mental Checkpoint**: "Tests must comprehensively verify the new code works as specified."

**Note**: No "fail on old code" requirement—there is no old code. Focus on proving the new implementation is correct.

---

### Phase 5: SCOPE THE SOLUTION

**Mode-Specific Guiding Questions**:
- **TRANSFORMATION**: "What is the smallest edit that achieves the goal?"
- **CREATION**: "What is the minimal implementation that meets all requirements?"

---

#### TRANSFORMATION MODE

**Required Elements**:
- Change surface mapping (which files, which lines, which components)
- Categorization: Additions, Modifications, Deletions
- Impact assessment: Lines of code, complexity delta, dependency changes
- Net change calculation

**Principle**: "The best solution is often the one that removes code, not adds it. Deletion is a feature."

**Format**:
```
**[Component/Layer] changes**:
- Remove: [What is being eliminated]
- Add: [What is being introduced]
- Modify: [What is being changed]
- Impact: [Net effect]
```

---

#### CREATION MODE

**Required Elements**:
- Component inventory (what must be created)
- File/module structure
- Dependency requirements
- Complexity estimate per component

**Principle**: "Build the simplest thing that works. Avoid premature abstraction."

**Format**:
```
**[Component/Layer] to create**:
- Files: [List of files to create]
- Dependencies: [Required libraries/modules]
- Complexity: [Low/Medium/High]
- Purpose: [What this component does]
```

**Note**: No "Remove" or "Modify"—everything is new.

---

### Phase 6: TRACE DATA/CONTROL FLOW (Follow the Path)

**Mode-Specific Guiding Questions**:
- **TRANSFORMATION**: "How does data/control flow change?"
- **CREATION**: "How will data/control flow through the new system?"

---

#### TRANSFORMATION MODE

**Required Elements**:
- Before flow diagram (conceptual or textual)
- After flow diagram (conceptual or textual)
- Identification of eliminated hops/boundaries
- Observation of simplified paths

**Format**:
```
**Before**:
[Step] → [Step] → [Step] → [Step] → [Step]

**After**:
[Step] → [Step] → [Step]
```

---

#### CREATION MODE

**Required Elements**:
- Designed flow diagram (conceptual or textual)
- Key decision points and branches
- Data transformations at each step
- Integration points with external systems

**Format**:
```
**Designed Flow**:
[Input] → [Process A] → [Process B] → [Output]
                ↓
          [Error Handler]
```

**Note**: No "Before" state—describe the flow you are designing.

---

**Principle**: "Data should flow through the fewest possible boundaries. Each boundary is a potential failure point."

---

### Phase 7: ANTICIPATE OBJECTIONS (Play Devil's Advocate)
**Guiding Question**: "What could go wrong? What objections might arise?"

**Required Elements**:
- List of potential objections (minimum 3-4)
- Counter-argument for each objection
- Honest assessment of trade-offs
- Conditions under which the solution would NOT apply

**Format**:
```

**Objection N**: "[The concern]"

- **Counter**: [Why this concern is addressed or acceptable]

```

**Principle**: "If you cannot defend your solution against objections, you do not understand the problem well enough."

---

### Phase 8: VERIFY INVARIANTS / DEFINE CONSTRAINTS

**Mode-Specific Guiding Questions**:
- **TRANSFORMATION**: "What must remain true before, during, and after this change?"
- **CREATION**: "What constraints must the new system satisfy?"

---

#### TRANSFORMATION MODE

**Required Elements**:
- **Must preserve**: Existing functionality that cannot break
- **Must improve**: Specific improvements that define success
- **Must not break**: Dependencies, integrations, user expectations

**Format**:
```
**Must preserve**:
- [Invariant] ✓ (How it's preserved)

**Must improve**:
- [Improvement] ✓ (How it's achieved)

**Must not break**:
- [Constraint] ✓ (Why it won't break)
```

---

#### CREATION MODE

**Required Elements**:
- **Must satisfy**: Core requirements that define success
- **Must support**: Integration points, extensibility needs
- **Must not violate**: Security, performance, or design constraints

**Format**:
```
**Must satisfy**:
- [Requirement] ✓ (How it's implemented)

**Must support**:
- [Integration/Extension] ✓ (How it's designed)

**Must not violate**:
- [Constraint] ✓ (How it's enforced)
```

---

**Mental Checkpoint**: "If any constraint is violated, the solution fails—regardless of how 'clean' the code looks."

---

### Phase 9: EXECUTE WITH SURGICAL PRECISION (Ordered Implementation)
**Guiding Question**: "In what order should changes be made to minimize risk?"

**Required Elements**:
- Numbered steps in execution order
- Rationale for ordering ("Why first?", "Why second?")
- Risk assessment for each step (Low/Medium/High)
- Validation checkpoint after each step

**Format**:
```

**Step N**: [Action]

- Why [position]? [Rationale]
- Risk: [Low/Medium/High] - [Explanation]

```

**Principle**: "Order matters. Each step should leave the system in a valid state, even if incomplete."

---

### Phase 10: MEASURE IMPACT / VERIFY COMPLETION

**Mode-Specific Guiding Questions**:
- **TRANSFORMATION**: "Did we actually improve? Can we prove it?"
- **CREATION**: "Did we build what was required? Can we prove it?"

---

#### TRANSFORMATION MODE

**Required Elements**:
- Concrete metrics with before/after values
- Categories: Complexity, Security, Maintainability, Performance, Test Results
- Quantifiable improvements (numbers, percentages, counts)

**Format**:
```
**[Category]**:
- [Metric]: [Before value] → [After value] ([Interpretation])
```

---

#### CREATION MODE

**Required Elements**:
- Requirement completion checklist
- Quality metrics for new code
- Test coverage and results
- Performance baselines established

**Format**:
```
**Requirements Completion**:
- [REQ-01]: ✅ Implemented (evidence: [test/file])
- [REQ-02]: ✅ Implemented (evidence: [test/file])

**Quality Metrics**:
- Test Coverage: [X]%
- All Tests Passing: ✅
- Code Review: ✅
```

**Note**: No "before" comparison—measure against requirements and quality standards.

---

**Mental Checkpoint**: 
- TRANSFORMATION: "If I cannot measure it, I cannot prove the improvement."
- CREATION: "If I cannot verify it meets requirements, I cannot prove it's complete."

---

### Phase 11: DOCUMENT THE DECISION (Capture Context for Future)
**Guiding Question**: "Why did we do this, and when should it be revisited?"

**Required Elements**:
- **Problem**: One-sentence problem statement
- **Solution**: One-sentence solution statement
- **Trade-offs**: What was lost vs. what was gained
- **Why this works**: Core reasoning in 1-2 sentences
- **When to revisit**: Conditions that would invalidate this solution
- **Test Coverage**: Summary of validation approach

**Principle**: "Future maintainers will forget why this change was made. Document it now."

---

## EXTERNAL REFERENCE GUIDELINES

Include external references when the trajectory introduces:
- Novel APIs or poorly documented behaviors
- Design patterns or anti-patterns that benefit from deeper explanation
- Performance concepts (N+1 queries, keyset pagination, etc.)
- Security concepts (attack vectors, trust boundaries, etc.)
- Architectural principles (SOLID, separation of concerns, etc.)

**Format**:
```

Learn more about [concept]: [Brief description]
Link: [URL to official documentation or authoritative source]

```

**Sources Priority**:
1. Official documentation
2. Peer-reviewed or authoritative technical articles
3. Well-known educational content (reputable YouTube channels, conference talks)

---

## OUTPUT FORMAT

The generated trajectory must:
1. Use Markdown formatting with clear headers
2. Include the task title as `# Trajectory: [Task Name]`
3. Use `### N. Phase Title (Descriptive Subtitle)` for each phase
4. Include code blocks with triple backticks where appropriate
5. Use bold for key insights and principles
6. End with Phase 11 (Document the Decision)

---

## QUALITY CRITERIA FOR GENERATED TRAJECTORIES

A well-formed trajectory must:
- [ ] Expose reasoning, not just outcomes
- [ ] Explain WHY at every decision point
- [ ] Include measurable success criteria
- [ ] Map requirements to validation
- [ ] Document trade-offs honestly
- [ ] Anticipate and address objections
- [ ] Provide before/after comparisons (TRANSFORMATION) OR requirement-completion evidence (CREATION)
- [ ] Include external references for novel concepts
- [ ] Be suitable as SFT/RL training data
- [ ] Use correct mode (TRANSFORMATION vs CREATION) for the task type

---

## MULTI-AGENT WORKFLOW COMPATIBILITY

This trajectory serves as the **single source of truth** for:
- **Test Agent**: Uses Phase 4 (validation mapping) and Phase 10 (metrics) to generate test cases
- **Evaluation Agent**: Uses Phase 3 (success criteria) and Phase 10 (measurements) to assess quality
- **Report Agent**: Uses Phase 11 (documentation) to generate summaries

Each phase is designed to be independently referenceable by downstream agents.
```

---

## USAGE INSTRUCTIONS

1. **Gather inputs**:
   - `{{TASK_DESCRIPTION}}`: The full task description from instance.json or problem statement
   - `{{PROJECT_STRUCTURE}}`: The directory tree or relevant file list
   - `{{TASK_CATEGORY}}`: Select the appropriate category
   - `{{TASK_MODE}}`: TRANSFORMATION or CREATION
   - `{{LANGUAGE_FRAMEWORK}}`: Optionally specify (leave blank for agnostic output)
2. **Analyze the codebase**: Review `repository_before` and `repository_after` (or just `repository_after` for CREATION mode)
3. **Create the trajectory file**: Generate `trajectory/trajectory.md` following the 11-Phase structure
4. **Review and refine** the output for training data quality

**IMPORTANT**: The output of this framework is an actual `trajectory/trajectory.md` file, not a prompt. The file must be created in the `trajectory/` folder of the project.

---

## APPENDIX: CATEGORY-SPECIFIC PHASE ADAPTATIONS

### Refactoring

| Phase    | Focus                                      |
| -------- | ------------------------------------------ |
| Audit    | Code/architecture patterns, scaling issues |
| Contract | Performance conditions, invariants         |
| Design   | Data model efficiency, query patterns      |
| Execute  | Surgical code changes                      |
| Verify   | Behavior preservation, metrics             |

### Full-Stack Development

| Phase    | Focus                       |
| -------- | --------------------------- |
| Audit    | System & product flow       |
| Contract | API, UX, and data contracts |
| Design   | DTOs, frontend state shape  |
| Execute  | API + UI implementation     |
| Verify   | E2E tests, latency budgets  |

### Performance Optimization

| Phase    | Focus                          |
| -------- | ------------------------------ |
| Audit    | Runtime profiling, bottlenecks |
| Contract | SLOs, SLAs, latency budgets    |
| Design   | Indexes, caches, async paths   |
| Execute  | Hot path optimization          |
| Verify   | Benchmarks, load tests         |

### Testing

| Phase    | Focus                       |
| -------- | --------------------------- |
| Audit    | Coverage gaps, risk areas   |
| Contract | Test strategy, guarantees   |
| Design   | Fixtures, factories, mocks  |
| Execute  | Deterministic test creation |
| Verify   | Assertions, invariants      |

### Code Generation (CREATION MODE)

| Phase | Focus |
|-------|-------|
| Requirements | Input/output specs, constraints, edge cases |
| Scope | What to build, minimal viable structure |
| Design | Domain model, architecture decisions |
| Execute | Implementation order, component creation |
| Verify | Correctness, style, completeness |

**Note**: No "before" state—trajectory describes what is being built and why.

### New Feature / 0-1 Development (CREATION MODE)

| Phase | Focus |
|-------|-------|
| Requirements | User stories, acceptance criteria |
| Scope | Feature boundaries, integration points |
| Design | Architecture, data models, APIs |
| Execute | Build order, component implementation |
| Verify | Acceptance tests, integration tests |

### Bug Fix

| Phase    | Focus                            |
| -------- | -------------------------------- |
| Audit    | Failure reproduction, root cause |
| Contract | Correctness conditions           |
| Design   | Minimal fix scope                |
| Execute  | Targeted fix                     |
| Verify   | Regression test                  |

### Migration

| Phase    | Focus                                  |
| -------- | -------------------------------------- |
| Audit    | Compatibility, dependencies            |
| Contract | Backward compatibility, data integrity |
| Design   | Migration path, rollback strategy      |
| Execute  | Phased migration                       |
| Verify   | Data validation, smoke tests           |

---

## VERSION HISTORY

| Version | Date    | Changes            |
| ------- | ------- | ------------------ |
| 1.0     | Initial | Framework creation |

---

**Core Principle**: The trajectory structure stays the same. Only the focus and artifacts change. Audit → Contract → Design → Execute → Verify remains constant.
