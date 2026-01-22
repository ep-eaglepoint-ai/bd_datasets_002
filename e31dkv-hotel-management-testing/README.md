# E31DKV - hotel management testing

**Category:** sft

## Overview
- Task ID: E31DKV
- Title: hotel management testing
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: e31dkv-hotel-management-testing

## Requirements
- Database Connection Success Test: Create a test that verifies the connect() method in both Rooms.java and Bookings.java successfully establishes a connection to the database when the MySQL server is available and the credentials (username: "keti", password: "password") are correct, asserting that the Connection object is not null and is not closed after the method completes.
- Database Connection Failure Handling Test: Create a test that verifies when the MySQL database is unavailable or credentials are wrong, the application handles the SQLException gracefully without crashing, properly logs the error using java.util.logging.Logger, and presents a user-appropriate error state rather than exposing stack traces to the user
- Load All Rooms Test: Create an integration test that populates the test database with known room records, calls the Load_room() method in Rooms.java, and verifies that the DefaultTableModel contains exactly the expected number of rows with correct values for id, roomnumber, floor, room_type, price, and booked status displayed as "Booked" or "Available" strings.
- Load Booked Rooms Only Test: Create an integration test for the Load_bookings() method in Bookings.java that inserts multiple rooms with varying booked statuses into the test database and verifies that only rooms where booked equals true appear in the bookings_table, confirming the SQL WHERE clause r.booked = true functions correctly.
- Add Room Success Test: Create an integration test that fills in valid values for room number, floor, room type, and price, triggers the btn_saveMouseClicked() method, and verifies that a new record exists in the database with booked defaulting to false, that the success dialog "Room Added Successfully" would be shown, and that the form fields are cleared after successful insertion.
- Add Room Empty Room Number Test: Create a test that attempts to add a room with an empty string for room number and verifies the system either rejects this input with a validation error before database insertion or that the database constraint prevents the insertion and an appropriate error message is displayed to the user.
- Add Room Invalid Price Format Test: Create a test that attempts to add a room with non-numeric text in the price field such as "abc" or "12.34.56" and verifies that the system handles the NumberFormatException or SQLException gracefully, displays an error message to the user, and does not insert a corrupted record into the database.
- Add Room SQL Injection Prevention Test: Create a security test that attempts to inject malicious SQL through the room number field such as 101'; DROP TABLE rooms; -- and verifies that the PreparedStatement properly escapes the input, no SQL injection occurs, and the rooms table remains intact after the operation.
- Checkout Room Success Test: Create an integration test that first ensures a room exists in the database with booked set to true, calls the checkout() method with that room's ID, and verifies the database record now has booked set to false and the success message "Room checked out successfully" would be displayed.
- Checkout Room No Selection Test: Create a GUI test that simulates clicking the checkout button when no row is selected in the bookings_table (getSelectedRow() returns -1) and verifies the error dialog "Please select a room to checkout" is displayed and no database modification occurs.
- Checkout Nonexistent Room Test: Create an integration test that calls the checkout() method with a room ID that does not exist in the database and verifies the system handles this gracefully without throwing an unhandled exception, though the user feedback for this edge case should be examined and potentially improved.
- Login Button Navigation Test: Create a GUI test that simulates clicking the "Sign in" button (jButton1) on the Login form and verifies that a new Rooms window is created and made visible, and that the Login window is disposed of properly without memory leaks.
- Rooms to Bookings Navigation Test: Create a GUI test that simulates clicking the "Bookings" label (jLabel7) in the Rooms window and verifies navigation correctly opens a new Bookings window, disposes of the current Rooms window, and maintains proper application state.
- Bookings to Rooms Navigation Test: Create a GUI test that simulates clicking the "Rooms" label (jLabel1) in the Bookings window and verifies navigation correctly opens a new Rooms window and disposes of the Bookings window.
- Logout Navigation Test: Create a GUI test for both Rooms and Bookings windows that simulates clicking the "Logout" label (logoutBtn) and verifies a new Login window is created, made visible, and the current window is properly disposed.
- JTable Column Configuration Test: Create a test that verifies the rooms_table has exactly six columns with headers "ID", "Room Number", "Floor", "Type", "Price", "Status" in that order, and that the bookings_table has exactly five columns with headers "Room ID", "Room Number", "Type", "Floor", "Price" in that order.
- JTable Cell Editability Test: Create a test that verifies all cells in both rooms_table and bookings_table return false for isCellEditable() for all row and column indices, ensuring users cannot directly edit table data which would bypass validation and database synchronization.
- Room Type Dropdown Options Test: Create a test that verifies the r_type JComboBox contains exactly four options: "Suite Presidential", "Suite Single Bed", "Suite Double Bed", and "Suite Family" in that order, matching the database schema expectations.
- Floor Dropdown Options Test: Create a test that verifies the r_floor JComboBox contains exactly three options: "Ground", "First Floor", and "Second floor" in that order, noting the inconsistent capitalization of "floor" in "Second floor" which may be intentional or a bug to document.
- Form Clear After Add Test: Create a test that verifies after successfully adding a room, the r_number text field is empty, r_floor is reset to index 0 ("Ground"), r_type is reset to index 0 ("Suite Presidential"), and r_price text field is empty, ensuring the form is ready for the next entry.
- Concurrent Database Access Test: Create a test that simulates two simultaneous checkout operations on the same room from different threads and verifies that database integrity is maintained, no duplicate updates occur, and the final state correctly reflects exactly one checkout operation.
- Large Dataset Performance Test: Create a performance test that inserts 1000 room records into the database, calls Load_room(), and verifies the operation completes within an acceptable time threshold (such as 5 seconds) and does not cause OutOfMemoryError from the Vector and DefaultTableModel operations.
- Metatest Mutation Coverage: Configure PIT mutation testing to run against all test classes and verify that the mutation score is at least 80%, meaning at least 80% of code mutations introduced by PIT cause at least one test to fail, proving the tests actually verify behavior rather than just executing code.
- Metatest Assertion Presence: Use reflection or static analysis to verify that every test method annotated with @Test contains at least one assertion call (assertTrue, assertFalse, assertEquals, assertNotNull, assertThrows, etc.) ensuring no test methods are empty or assertion-free.
- Metatest No Trivial Assertions: Create an architectural test using ArchUnit or custom analysis that scans test methods for trivial assertions such as assertTrue(true), assertEquals(1, 1), or assertions that compare a variable to itself, and fails if any such assertions exist.
- Metatest Test Class Naming Convention: Create an ArchUnit test that verifies all test classes end with the suffix "Test" (such as RoomsTest, BookingsTest, LoginTest), are located in the correct test source directory, and correspond to a production class they are testing.
- Metatest Test Method Naming Convention: Create an architectural test that verifies all test methods follow a consistent naming pattern such as test[MethodName]_[Scenario]_[ExpectedBehavior] or similar, ensuring test names clearly document what is being tested and what the expected outcome is.
- Metatest Database Isolation: Create a metatest that verifies each integration test properly cleans up after itself by checking that running tests in any order produces the same results, confirming no test depends on state left behind by a previous test.
- Metatest Mock Verification: Create a metatest that uses reflection to verify that all tests using Mockito mocks include appropriate verify() calls to ensure mocked dependencies were actually invoked as expected, preventing tests that create mocks but never confirm they were used correctly.
- Metatest Code Coverage Threshold: Configure JaCoCo or similar coverage tool and create a build verification that fails if line coverage drops below 70% for production code or if any critical method (connect, Load_room, Load_bookings, checkout, btn_saveMouseClicked) has less than 90% branch coverage.

## Metadata
- Programming Languages: Java
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
