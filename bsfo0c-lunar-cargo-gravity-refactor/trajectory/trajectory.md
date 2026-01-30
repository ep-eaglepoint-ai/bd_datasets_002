# Development Trajectory

## Task: Lunar Cargo Gravity Refactor

### Phase 1: Analysis
- Legacy packing was sequential and ignored center of gravity and balance.
- Requirements mandate CoG priority, lateral balance within 10%, and weight capacity preservation.
- Optimization requirement: single pass for sorting and placement.

### Phase 2: Design
- Use insertion sort during single pass through items.
- Place heaviest item at center X and lowest Y.
- Alternate placement to maintain left/right balance.
- Skip items that violate balance or capacity.

### Phase 3: Implementation
- Implemented single-pass algorithm using insertion sort.
- Each item is inserted in sorted position, then all placements are recalculated.
- This combines sorting and placement in one unified pass through input.
- Preserved max capacity checks.

### Phase 4: Testing
- Requirement 1 (Data Migration): placement includes x and y coordinates.
- Requirement 2 & 6 (CoG Balancing): heavy item placed at y=0 and center.
- Requirement 3 & 7 (Lateral Balance): identical weights balanced laterally.
- Requirement 4 (Constraint Preservation): never exceeds max capacity.
- Requirement 5 (Optimization): uses single pass for sorting and placement.

### Phase 5: Verification
- repository_after passes all 5 tests.
- repository_before fails 2 tests (balance and CoG).
- Single-pass requirement verified by checking absence of Array.sort() call on items.
