# Trajectory

## Task
Write comprehensive test suites for a React Note Taker Application using Jest and React Testing Library. The application supports CRUD operations, tag management, and async operations via an in-memory mock API.

## Implementation

### Test Setup
- Jest with jsdom environment
- React Testing Library for component testing
- @testing-library/user-event for user interactions
- Real timers with waitFor for async operations

### Test Categories

1. **Initial Render and Loading Tests** (4 tests)
   - Header display
   - Loading state on mount
   - Empty state after loading
   - Initial note count

2. **Create Note Tests** (4 tests)
   - Creating notes with title/content
   - Note count increment
   - Correct display of created notes
   - Tag count updates in sidebar

3. **Form Validation Tests** (2 tests)
   - Empty title validation
   - Empty content validation

4. **Tag Input Tests** (4 tests)
   - Enter key adds tags
   - Comma key adds tags
   - Duplicate prevention
   - Tag removal

5. **Tag Filter Tests** (1 test)
   - Tag counts display correctly

6. **Edit Note Tests** (2 tests)
   - Edit mode activation and pre-fill
   - Note updates in edit mode

7. **Delete Note Tests** (4 tests)
   - Confirm false prevents deletion
   - Confirm true deletes note
   - Tag count updates after deletion
   - Empty state after last deletion

### Key Technical Decisions
- Used real timers with waitFor instead of fake timers to avoid test hangs
- Used unique identifiers (Date.now()) for test data to prevent conflicts
- Tests are resilient to shared mockAPI state by using relative counts
- Mocked window.alert and window.confirm for validation and deletion tests
- Used --forceExit and --testTimeout flags for reliability

## Tests
21 comprehensive tests covering all 15 requirements from the task.
