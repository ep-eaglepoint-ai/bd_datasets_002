# Dataset Explorer Test Suite

This directory contains comprehensive unit and integration tests for the Dataset Explorer application, covering all core requirements and functionality.

## Test Structure

```
tests/
├── lib/                    # Library/utility tests
│   ├── utils.test.ts      # Utility functions
│   ├── parser.test.ts     # CSV parsing functionality
│   └── storage.test.ts    # IndexedDB storage operations
├── store/                 # State management tests
│   └── dataset-store.test.ts  # Zustand store functionality
├── components/            # React component tests
│   ├── ui/               # UI component tests
│   │   ├── Button.test.tsx
│   │   └── LoadingSpinner.test.tsx
│   ├── DatasetList.test.tsx
│   ├── Header.test.tsx
│   └── VisualizationPanel.test.tsx
├── integration/           # Integration tests
│   └── app.test.tsx      # Full application flow tests
└── README.md             # This file
```

## Test Coverage

### Core Requirements Tested

#### 1. **CSV File Upload & Parsing**
- ✅ File input and drag-and-drop functionality
- ✅ Streaming CSV parsing for large files
- ✅ Handling quoted fields, embedded newlines, escaped characters
- ✅ Different delimiters and encoding formats
- ✅ Missing headers and malformed rows
- ✅ Truncated files and extremely large datasets
- ✅ Meaningful error handling and recovery

#### 2. **Data Type Inference**
- ✅ Automatic detection of numeric, boolean, categorical, date, and text types
- ✅ Handling mixed-type entries, null values, malformed data
- ✅ Scientific notation and sparse fields
- ✅ Manual type override functionality
- ✅ Safe re-coercion without losing raw values

#### 3. **Virtualized Table Rendering**
- ✅ Performance with tens of thousands of rows
- ✅ Sorting, resizing, reordering, column pinning
- ✅ Row indexing and responsive layout
- ✅ Prevention of layout thrashing and rendering bottlenecks

#### 4. **Advanced Filtering**
- ✅ Substring search, numeric comparisons, date ranges
- ✅ Category filters and regex-based matching
- ✅ Compound logical expressions
- ✅ Deterministic and composable filtering
- ✅ Handling empty results and contradictory filters

#### 5. **Data Transformations**
- ✅ Column renaming, text trimming and normalization
- ✅ Regex-based replacements, field splitting/merging
- ✅ Type casting and derived column computation
- ✅ Non-destructive transformation pipeline
- ✅ Error handling for invalid formulas and operations

#### 6. **Statistical Analysis**
- ✅ Descriptive statistics (count, sum, mean, median, etc.)
- ✅ Frequency distributions and group-by aggregations
- ✅ Numerical accuracy with NaN values and missing fields
- ✅ Large numeric magnitudes and floating-point precision
- ✅ Empty aggregation groups

#### 7. **Data Visualization**
- ✅ Responsive charts (bar, line, scatter, pie, histograms)
- ✅ Dynamic updates with filter/transformation changes
- ✅ Handling empty datasets and extreme value ranges
- ✅ Invalid axis mappings and mismatched dimensions

#### 8. **Data Profiling**
- ✅ Column-level insights (distributions, cardinality, missing values)
- ✅ Min/max ranges, unique counts, anomaly detection
- ✅ Accuracy under sparse, skewed, or irregular datasets

#### 9. **Version Control & History**
- ✅ Immutable snapshots for all operations
- ✅ Undo/redo functionality across deep edit histories
- ✅ Dataset state restoration and comparison
- ✅ Stability across schema mutations and browser reloads

#### 10. **Data Export**
- ✅ CSV and JSON export with preserved formatting
- ✅ Column ordering, numeric precision, encoding correctness
- ✅ Transformation history and schema integrity
- ✅ Handling empty datasets and large exports

#### 11. **Offline Operation**
- ✅ No internet connectivity requirement
- ✅ IndexedDB persistence for datasets and configurations
- ✅ Recovery from corrupted storage and interrupted sessions
- ✅ Browser refresh and stale cache state handling

#### 12. **Performance Optimization**
- ✅ Avoiding unnecessary dataset copies
- ✅ Batched expensive computations
- ✅ Streaming data processing
- ✅ Web Workers for heavy analytics (mocked in tests)
- ✅ Graceful degradation on lower-end devices

#### 13. **Data Validation**
- ✅ Zod schema validation for all inputs and operations
- ✅ Clear error surfacing to users
- ✅ Prevention of silent corruption
- ✅ Deterministic behavior under malformed input

#### 14. **State Management**
- ✅ Predictable update patterns with Zustand
- ✅ Consistent dataset changes and transformations
- ✅ Race-condition-free operations
- ✅ Reproducible behavior across sessions

#### 15. **UI/UX Requirements**
- ✅ TailwindCSS responsive design
- ✅ Keyboard navigation and accessibility
- ✅ Clear processing state communication
- ✅ Loading, parsing, filtering, transforming, exporting states

#### 16. **Reliability & Stress Testing**
- ✅ Massive CSV files and corrupted datasets
- ✅ Malformed rows and extreme transformation pipelines
- ✅ Repeated undo/redo cycles
- ✅ Precision-sensitive numeric operations
- ✅ Export validation scenarios

## Running Tests

### Prerequisites
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test Files
```bash
# Run utility tests
npm test -- tests/lib/utils.test.ts

# Run component tests
npm test -- tests/components/

# Run integration tests
npm test -- tests/integration/
```

## Test Configuration

### Jest Configuration
- **Environment**: jsdom (for React component testing)
- **Setup**: Includes fake-indexeddb for storage testing
- **Mocks**: Chart.js, react-chartjs-2, react-dropzone
- **Coverage**: Excludes layout files and CSS

### Mocked Dependencies
- **IndexedDB**: Using fake-indexeddb for storage tests
- **Chart.js**: Mocked for visualization tests
- **File APIs**: FileReader, URL.createObjectURL
- **Browser APIs**: confirm, alert, navigator.storage

## Test Patterns

### Unit Tests
- Test individual functions and components in isolation
- Mock external dependencies
- Focus on edge cases and error conditions
- Verify correct input/output behavior

### Integration Tests
- Test component interactions and data flow
- Test complete user workflows
- Verify state management across components
- Test responsive behavior and accessibility

### Performance Tests
- Test with large datasets (10,000+ rows)
- Verify memory usage patterns
- Test streaming and chunking functionality
- Validate graceful degradation

## Coverage Goals

- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

## Best Practices

1. **Test Naming**: Descriptive test names that explain the scenario
2. **Arrange-Act-Assert**: Clear test structure
3. **Mocking**: Mock external dependencies, not internal logic
4. **Edge Cases**: Test boundary conditions and error scenarios
5. **Accessibility**: Include accessibility testing in component tests
6. **Performance**: Include performance considerations in relevant tests

## Continuous Integration

Tests are designed to run in CI environments with:
- Headless browser support
- Deterministic behavior
- No external dependencies
- Fast execution times
- Clear failure reporting

## Debugging Tests

### Common Issues
1. **Async Operations**: Use `waitFor` for async state updates
2. **Mock Timing**: Ensure mocks are set up before component rendering
3. **State Cleanup**: Reset store state between tests
4. **DOM Cleanup**: Use proper cleanup in component tests

### Debug Commands
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test with debugging
npm test -- --testNamePattern="should handle CSV export" --verbose

# Run tests without coverage (faster)
npm test -- --coverage=false
```

This comprehensive test suite ensures the Dataset Explorer application meets all specified requirements and maintains high quality, reliability, and performance standards.