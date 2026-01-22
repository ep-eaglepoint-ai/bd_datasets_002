# OXRVXF - web-tesing

**Category:** sft

## Overview
- Task ID: OXRVXF
- Title: web-tesing
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: oxrvxf-web-tesing

## Requirements
- Task creation tests must use page.evaluate() to call createTask with a valid title and column and verify the returned task object contains a unique string ID matching the pattern "task-" followed by a timestamp and random characters, a title property exactly matching the trimmed input string, and a column property matching the specified column, while also confirming through additional page.evaluate() calls that the task was appended to the global tasks array and that localStorage under the correct key contains the serialized updated state.
- Task deletion tests must use page.evaluate() to confirm that calling deleteTask with a valid task ID removes exactly one task from the tasks array, leaves all other tasks untouched with their original properties intact, updates localStorage immediately after removal, and that calling deleteTask with a non-existent ID does not throw an error and does not modify the tasks array while still updating localStorage to maintain consistency.
- Task movement tests must use page.evaluate() to validate that moveTask correctly updates the column property of the specified task, that when an insertBeforeId is provided the task is repositioned in the array immediately before the target task, that moving a task to its current column and position results in no net change to array order, and that invalid task IDs or column values are handled gracefully without corrupting the tasks array.
- Drag-and-drop tests must use Playwright's page.locator().dragTo() method to simulate a complete drag operation from a task in one column to another column, then verify using locator assertions that the task element now exists within the target column's DOM container, use page.evaluate() to confirm the tasks array reflects the new column assignment, and verify through expect(page.locator()).toHaveClass() that all visual drag states like the dragging and drag-over classes are properly cleaned up after the drop completes.
- LocalStorage persistence tests must use page.evaluate() to pre-populate localStorage with specific test data before page.reload(), then verify after reload that the rendered DOM matches the persisted state, must test that corrupted or malformed JSON in localStorage does not crash the application but instead falls back gracefully by checking that the page still renders and functions, must verify that when localStorage is completely empty the application initializes with the default sample tasks visible in the DOM, and must use page.evaluate() after every state-modifying UI action to confirm localStorage contains valid JSON matching the expected state.
- Modal interaction tests must use page.locator('[data-column="todo"] .add-task-btn').click() to open the modal and verify with expect(page.locator('.modal-overlay')).toHaveClass(/active/) that it becomes visible, must verify the input receives focus using expect(page.locator('#task-input')).toBeFocused(), must test that submitting with an empty or whitespace-only title via page.keyboard.press('Enter') does not create a task and does not close the modal, must test that typing valid text and submitting creates the task in the correct column verified by checking the DOM and closes the modal verified by checking the class is removed, must verify that page.keyboard.press('Escape') closes the modal without creating a task, and must verify that clicking the overlay backdrop via page.locator('.modal-overlay').click({position: {x: 10, y: 10}}) closes the modal.
- Inline editing tests must use page.locator('.task').dblclick() to trigger edit mode and verify the task has the editing class and the input is visible and pre-filled with the current title, must use page.fill() to change the text and page.keyboard.press('Enter') to save then verify both the DOM text content and the tasks array via page.evaluate() reflect the new title, must verify that page.keyboard.press('Escape') reverts to the original title without saving, must verify that page.locator('.task-edit-input').blur() saves changes, and must test that attempting to save an empty string preserves the original title in both the DOM and the data layer.
- DOM rendering tests must verify using page.locator('.task').count() that the correct number of tasks appear in each column, must use expect(page.locator('[data-count="todo"]')).toHaveText() to verify task count badges accurately reflect the number of tasks in each column, must verify that empty columns display the empty state message using expect(page.locator('#todo-tasks .empty-state')).toBeVisible(), and must verify proper HTML structure by checking data-id attributes exist on all task elements.
- Meta-test for assertion presence must use Node.js fs module to read each Playwright test file and parse it to verify that every test() block contains at least one expect() call or Playwright assertion method like toBeVisible, toHaveText, or toHaveClass, flagging any tests that would pass vacuously due to missing assertions, and this meta-test must itself fail if a new test is added without assertions.
- Meta-test for proper isolation must verify that each test file includes a test.beforeEach hook that either navigates to a fresh page or clears localStorage via page.evaluate(() => localStorage.clear()), ensuring that test pollution cannot occur where one test's state affects subsequent tests, and must flag any test file missing this isolation setup.
- Meta-test for async handling must scan all test files and verify that every Playwright locator action like click(), fill(), and dragTo() is preceded by await, and that every expect assertion on a locator uses an async matcher or is properly awaited, flagging any potential race conditions from missing awaits that could cause flaky tests.
- Meta-test for test isolation must configure Playwright to run all tests with fullyParallel: true and workers set to the maximum available, run the test suite multiple times, and verify that all tests pass regardless of execution order and parallelization, confirming that no test depends on side effects from another test running first or sequentially.
- Meta-test for description accuracy must use pattern matching on test file contents to verify that test descriptions containing words like "creates" have assertions checking for element creation or array length increases, descriptions containing "deletes" have assertions checking for element removal or array length decreases, and descriptions containing "fails" or "error" have assertions checking for error conditions or unchanged state, flagging misleading descriptions that do not match their test behavior.
- Meta-test for coverage completeness must use Playwright's built-in coverage collection via page.coverage.startJSCoverage() and page.coverage.stopJSCoverage() to verify that the test suite achieves at least 90% line coverage and 85% branch coverage on app.js, must parse test files to verify every function defined in app.js has at least one test that invokes it, and must verify that the three critical user paths (create task, move task, delete task) each have both happy-path and error-path test coverage.
- Edge case tests must verify using page.evaluate() that task titles containing special HTML characters like angle brackets and ampersands are escaped and rendered as text not HTML by checking element.textContent versus element.innerHTML, must test task creation with exactly 100 characters verifying the full title is saved and displayed, must use dragTo() to drag a task onto itself and verify no state corruption occurs, must use page.evaluate() to fill localStorage near its quota then test that the application handles the storage full condition gracefully, and must use Promise.all() with multiple rapid sequential drag operations to verify the application handles race conditions without corrupting state.

## Metadata
- Programming Languages: HTML, CSS, JavaScript
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
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
