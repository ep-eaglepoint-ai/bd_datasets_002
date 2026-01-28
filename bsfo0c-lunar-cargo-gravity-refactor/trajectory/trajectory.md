# Development Trajectory

## Task: Lunar Cargo Gravity Refactor

### Phase 1: Analysis
- Legacy packing was sequential and ignored center of gravity and balance.
- Requirements mandate CoG priority, lateral balance within 10%, and weight capacity preservation.

### Phase 2: Design
- Sort items by weight (descending).
- Place heaviest item at center X and lowest Y.
- Alternate placement to maintain left/right balance.
- Skip items that violate balance or capacity.

### Phase 3: Implementation
- Implemented balanced placement with center-first strategy.
- Added hardware specs module for roverConfig.
- Preserved max capacity checks.

### Phase 4: Testing
- Heavy/Medium/Light placement test verifies CoG priority.
- Five identical items test verifies lateral balance.
- Capacity test ensures max weight constraint.

### Phase 5: Verification
- repository_after passes all tests.
- repository_before fails balance and CoG tests.
