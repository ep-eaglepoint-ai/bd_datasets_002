# MBNMIK - Incremental Build System with Transitive Dependency Detection

**Category:** sft

## Overview
- Task ID: MBNMIK
- Title: Incremental Build System with Transitive Dependency Detection
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: mbnmik-incremental-build-system-with-transitive-dependency-detection

## Requirements
- Configuration Parsing and Validation - The build configuration file must be parsed within 200ms for files up to 1MB in size containing up to 1000 components. - When the configuration file is missing, the system must fail immediately with error message: "Build configuration not found at path: {path}". Exit code must be 2. - When the JSON is malformed, the system must report the exact line and column of the syntax error: "Invalid JSON at line {line}, column {col}: {error_detail}". Exit code must be 2. - When a component references a non-existent dependency, the system must fail before any builds start with error: "Component '{component}' depends on unknown component '{dependency}'". Exit code must be 2. - When a component has no source files specified, the system must log warning: "Component '{name}' has no source files, skipping" and continue with other components. - When a source file path is specified but the file doesn't exist, the system must fail with error: "Source file '{path}' not found for component '{component}'". Exit code must be 1.
- Dependency Graph Construction - The dependency graph must be constructed in O(V + E) time where V = number of components and E = number of dependency edges. - For a configuration with 50 components and 200 dependencies, graph construction must complete in < 100ms. - Transitive dependencies must be correctly identified: if A depends on B and B depends on C, then when C changes, A must be marked for rebuild even though A doesn't directly depend on C. - The graph must support diamond dependencies correctly: if A depends on both B and C, and both B and C depend on D, then D must be built exactly once before B and C, and A must wait for both B and C to complete.
- Circular Dependency Detection - Circular dependencies must be detected during graph construction, before any build operations begin. - Detection must complete in O(V + E) time using depth-first search or equivalent algorithm. - For a 50-component graph, circular dependency detection must complete in < 50ms. - When a circular dependency is found, the error message must include the complete cycle path in format: "Circular dependency detected: A → B → C → A" - When multiple cycles exist, at least one cycle must be reported (reporting all cycles is optional). - After detecting a circular dependency, the system must exit with code 2 without attempting any builds.
- Change Detection and Dirty Marking - Each source file must be hashed using SHA-256 to detect changes. - For a codebase with 500 source files totaling 50MB, change detection must complete in < 2 seconds. - A component must be marked dirty if ANY of the following conditions are true:   - At least one of its source files has a different SHA-256 hash than stored in .build_state.json   - At least one of its direct dependencies was rebuilt in this build session   - The component has never been built before (not present in .build_state.json) - When a component is marked dirty, ALL components that depend on it (directly or transitively) must also be marked dirty in a single propagation pass. - The dirty propagation must complete in O(V + E) time.
- Build Order Determination - Components must be built in topological sort order, respecting all dependency constraints. - No component may begin building until ALL of its dependencies have completed successfully. - When multiple components are ready to build simultaneously (no pending dependencies), they may be built in any deterministic order, but the same configuration must always produce the same build order across multiple runs. - For a 50-component graph, topological sort must complete in < 50ms. - If Component A depends on [B, C, D] and B completes in 1s, C in 2s, D in 3s, then A must not start building until the 3-second mark (when D completes).
- Incremental Build Execution - Only components marked as dirty must be built. Clean components must be skipped entirely with zero build commands executed. - For each skipped component, a log entry must be written in format: "Skipping component '{name}': no changes detected (last built: {timestamp})" - For each built component, a log entry must be written in format: "Building component '{name}' (reason: {reason})" where reason is one of: "source files changed", "dependency '{dep}' was rebuilt", "first build" - The skip decision for each component must be made in < 10ms (time to check hashes and dependencies). - When 10 out of 50 components are dirty, exactly 10 components must be built and 40 must be skipped.
- Build State Persistence - The build state must be persisted to .build_state.json using atomic write (write to temp file, then rename). - The state file must contain for each component: name, last_build_timestamp (ISO 8601 format), source_file_hashes (dict of filepath → SHA-256 hash). - State updates must occur only after ALL builds complete successfully. If any build fails, the state file must remain unchanged. - If the build process is killed (SIGKILL) during execution, the state file must contain either the complete previous state OR the complete new state, never a corrupted/partial state. - When loading state on startup, if the file is missing, treat as first build (rebuild all components) without error. - When loading state on startup, if JSON parsing fails, log warning: "Corrupted build state detected, treating as first build" and rebuild all components.
- Build Failure Handling - When a component build fails (non-zero exit code), the build must stop immediately without attempting dependent components. - Components that depend on the failed component must be marked as "skipped due to dependency failure" in the logs. - The final exit code must be 1 (build failure) if any component fails to build. - The final exit code must be 0 (success) only if all dirty components build successfully. - Build failures must not corrupt the state file - it must remain unchanged from the previous successful build.
- Performance Guarantees - For a 50-component codebase with 500 source files (50MB total):   - Configuration parsing: < 200ms   - Dependency graph construction: < 100ms   - Change detection (SHA-256 hashing): < 2 seconds   - Circular dependency detection: < 50ms   - Topological sort: < 50ms   - Dirty propagation: < 50ms   - Total overhead (non-build time): < 2.5 seconds - Memory usage must not exceed 100MB for codebases up to 1000 components with 10,000 source files. - When only 1 leaf component (no dependents) changes in a 50-component codebase, build time must be reduced by at least 70% compared to rebuilding all components.
- Concurrent Build Safety (if multiple build processes run) - If two build processes start simultaneously, the second must detect the first via lock file and either:   - Wait for the first to complete, then proceed   - OR fail immediately with error: "Another build is in progress (PID: {pid})" - The lock file must be cleaned up automatically when the build process exits normally or is killed. - State file corruption must be prevented even if multiple processes attempt to write simultaneously.
- Logging Requirements - All log messages must include ISO 8601 timestamp with millisecond precision: "2024-01-15T10:30:45.123Z" - Log levels must be used appropriately: ERROR for failures, WARN for non-fatal issues, INFO for build decisions - Logs must be written to stderr to avoid interfering with stdout (which may be parsed by other tools). - The final summary must include: total components (N), dirty components (M), skipped components (N-M), failed components (F), total time (T seconds).
- Edge Case Handling - Empty configuration (zero components): Must complete successfully with message "No components to build" and exit code 0. - Component with empty dependencies list: Must be eligible to build immediately (no dependencies to wait for). - All components unchanged: Must skip all builds and complete in < 3 seconds (overhead only), exit code 0. - First build (no state file): Must build all components in dependency order. - 100 components change simultaneously: Must rebuild all 100 plus their dependents in correct order without errors.  ### 13. Stress Test Requirements - The system must handle a 100-component codebase where:   - Dependency depth reaches 15 levels (A→B→C→...→O)   - 30 components have diamond dependencies (A→B, A→C, B→D, C→D)   - 50 components change simultaneously   - Total of 2000 source files (200MB) - Build must complete without errors, produce correct build order, and each component must be built exactly once. - Total overhead (non-build time) must remain < 5 seconds even for this large codebase.

## Metadata
- Programming Languages: Python
- Frameworks: json, hashlib, pathlib, time, typing
- Libraries: (none)
- Databases: (none)
- Tools: None - no external build tools like Make, Bazel, or Ninja
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
