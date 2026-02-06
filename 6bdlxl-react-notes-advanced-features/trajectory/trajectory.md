# Trajectory: React Notes Advanced Features

### 1. Phase 1: AUDIT / REQUIREMENTS ANALYSIS

**Guiding Question**: "What exactly needs to be built, and what are the constraints?"

**Reasoning**:
The primary goal is to enhance an existing note-taking application with advanced productivity features while maintaining full backward compatibility. The system must demonstrate real-world state management patterns and seamless UI integration without breaking existing functionality.

**Key Requirements**:

- **Real-time Search**: Implement instant filtering of notes by title and content with visual feedback.
- **Date-based Filtering**: Support filtering notes by time ranges (Today, This Week, This Month, All Time).
- **Import/Export**: Robust JSON import with validation, individual note export (JSON/Text), and bulk export functionality.
- **State Management**: Accurate React state handling without localStorage, ensuring no regressions.
- **UI Integration**: Seamless integration of new features into existing interface without disrupting user workflows.

**Constraints Analysis**:

- **Forbidden**: No localStorage/sessionStorage usage, no breaking changes to existing CRUD operations.
- **Required**: Must use React 18, maintain existing mockAPI pattern, preserve all existing functionality.

### 2. Phase 2: QUESTION ASSUMPTIONS (Challenge the Premise)

**Guiding Question**: "Is there a simpler way? Why are we doing this from scratch?"

**Reasoning**:
While third-party libraries exist for search and filtering, building from scratch demonstrates fundamental React patterns and state management principles.

**Scope Refinement**:

- **Initial Assumption**: Might need complex debouncing for search.
- **Refinement**: Direct state-driven filtering is simpler and sufficient for the mockAPI's synchronous nature.
- **Rationale**: Keeps the implementation educational and maintainable while avoiding over-engineering.

### 3. Phase 3: DEFINE SUCCESS CRITERIA (Establish Measurable Goals)

**Guiding Question**: "What does 'done' mean in concrete, measurable terms?"

**Success Criteria**:

1. **Real-time Search**: Typing in search box instantly filters notes by title/content match.
2. **Date Filtering**: Four date range options (All Time, Today, This Week, This Month) correctly filter notes by updatedAt timestamp.
3. **Import Validation**: Invalid JSON files show error alerts; valid imports add notes with unique IDs.
4. **Export Functionality**: Individual notes export as JSON/Text; bulk export creates timestamped JSON file.
5. **No Regressions**: All existing CRUD operations (create, edit, delete, tag filtering) continue working.
6. **State Purity**: No localStorage/sessionStorage calls during normal operations.

### 4. Phase 4: MAP REQUIREMENTS TO VALIDATION (Define Test Strategy)

**Guiding Question**: "How will we prove the solution is correct and complete?"

**Test Strategy**:

- **Integration Tests**:
  - `App.test.js`: Verify date filtering with all four options.
  - Search functionality: Empty search shows all notes, filtered search hides non-matches.
  - Import button presence and file input triggering.
  - Unique ID generation for imported notes.
- **Regression Tests**:
  - Existing CRUD operations remain functional.
  - Tag filtering continues to work.
  - No localStorage usage during state updates.

### 5. Phase 5: SCOPE THE SOLUTION

**Guiding Question**: "What is the minimal implementation that meets all requirements?"

**Components to Create/Modify**:

- **SearchAndFilters Component**: New component for search input, date range selector, and import/export buttons.
- **HighlightedText Component**: New component for search term highlighting (optional enhancement).
- **NoteItem Enhancement**: Add export buttons (JSON/Text) to each note card.
- **App Component**: Add search/date state, filtering logic, import/export handlers.
- **mockAPI Enhancement**: Add `importNotes` method with validation and duplicate ID handling.

### 6. Phase 6: TRACE DATA/CONTROL FLOW (Follow the Path)

**Guiding Question**: "How will data/control flow through the new system?"

**Search Flow**:
User Input → setSearchQuery → filteredNotes computation → Re-render with filtered results.

**Date Filter Flow**:
Select Change → setDateRange → getDateRangeStart calculation → filteredNotes computation → Re-render.

**Import Flow**:
File Select → FileReader → JSON.parse → mockAPI.importNotes → Validation → ID deduplication → State update → Reload notes/tags.

**Export Flow**:
Button Click → JSON.stringify/Text formatting → Blob creation → URL.createObjectURL → Programmatic download → Cleanup.

### 7. Phase 7: ANTICIPATE OBJECTIONS (Play Devil's Advocate)

**Guiding Question**: "What could go wrong? What objections might arise?"

**Objection 1**: "Why not use a search library like Fuse.js?"

- **Counter**: For this scope, native string matching is sufficient and keeps dependencies minimal for educational purposes.

**Objection 2**: "Date filtering could be more granular (custom ranges)."

- **Counter**: Four preset ranges cover 90% of use cases and maintain UI simplicity. Custom ranges add complexity without proportional value.

**Objection 3**: "Import validation might be too strict."

- **Counter**: Strict validation prevents corrupt data from entering the system. Error messages guide users to fix issues.

### 8. Phase 8: VERIFY INVARIANTS / DEFINE CONSTRAINTS

**Guiding Question**: "What constraints must the new system satisfy?"

**Must Satisfy**:

- **Backward Compatibility**: All existing tests pass without modification ✓
- **State Isolation**: Search/filter state doesn't interfere with CRUD operations ✓
- **ID Uniqueness**: Imported notes never create duplicate IDs ✓
- **No Storage**: Zero localStorage/sessionStorage calls ✓

**Must Not Violate**:

- **Existing API Contract**: mockAPI methods maintain their signatures ✓
- **Component Hierarchy**: New components don't break existing layout ✓

### 9. Phase 9: EXECUTE WITH SURGICAL PRECISION (Ordered Implementation)

**Guiding Question**: "In what order should changes be made to minimize risk?"

1. **Step 1: mockAPI Enhancement**: Add `importNotes` method with validation logic. (Low Risk)
2. **Step 2: Search State**: Add searchQuery state and filtering logic to App. (Low Risk)
3. **Step 3: Date Filter State**: Add dateRange state and date calculation logic. (Medium Risk - date logic can be tricky)
4. **Step 4: SearchAndFilters Component**: Create new UI component for controls. (Low Risk)
5. **Step 5: Export Handlers**: Implement individual and bulk export functions. (Low Risk)
6. **Step 6: NoteItem Enhancement**: Add export buttons to note cards. (Low Risk)
7. **Step 7: Integration**: Wire all components together and test combined filtering. (High Risk - multiple state interactions)

**Quality Metrics**:

- **Test Coverage**: 9 comprehensive integration tests covering all features.
- **Success**: All tests pass, including regression tests for existing functionality.

### 10. Phase 10: DOCUMENT THE DECISION (Capture Context for Future)

**Problem**: Need advanced productivity features (search, date filtering, import/export) in an existing note-taking app without breaking compatibility.

**Solution**: Implemented client-side filtering using React state with computed filteredNotes, added SearchAndFilters component for controls, enhanced mockAPI with import validation, and created export handlers using Blob API.

**Trade-offs**:

- Client-side filtering is simple but won't scale to thousands of notes (acceptable for mockAPI scope).
- Preset date ranges are less flexible than custom ranges but maintain UI simplicity.
- File-based import/export requires user action but avoids server complexity.

**When to revisit**:

- If note count exceeds 1000+ (consider pagination/virtualization).
- If users request custom date ranges or advanced search operators.
- If real backend API replaces mockAPI (move filtering server-side).
