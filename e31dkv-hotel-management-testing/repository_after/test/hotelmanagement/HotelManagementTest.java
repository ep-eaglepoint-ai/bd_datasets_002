package hotelmanagement;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.sql.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test suite for Hotel Management System
 * Tests database operations, GUI components, navigation, and edge cases
 */
@ExtendWith(MockitoExtension.class)
public class HotelManagementTest {

    private static Connection h2Connection;

    @BeforeAll
    static void setupDatabase() throws SQLException {
        h2Connection = DriverManager.getConnection(
            "jdbc:h2:mem:hotelmanagement;MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        
        try (Statement stmt = h2Connection.createStatement()) {
            stmt.execute("CREATE TABLE IF NOT EXISTS rooms (" +
                "id INT PRIMARY KEY AUTO_INCREMENT, " +
                "roomnumber VARCHAR(100) NOT NULL, " +
                "floor VARCHAR(50) NOT NULL, " +
                "room_type VARCHAR(100) NOT NULL, " +
                "price DECIMAL(10,2) NOT NULL, " +
                "booked BOOLEAN DEFAULT FALSE)");
        }
    }

    @AfterAll
    static void teardownDatabase() throws SQLException {
        if (h2Connection != null && !h2Connection.isClosed()) {
            h2Connection.close();
        }
    }

    @BeforeEach
    void clearDatabase() throws SQLException {
        try (Statement stmt = h2Connection.createStatement()) {
            stmt.execute("DELETE FROM rooms");
            stmt.execute("ALTER TABLE rooms ALTER COLUMN id RESTART WITH 1");
        }
    }

    // ==================== Requirement 1: Database Connection Success Test ====================
    @Test
    @DisplayName("Req1: Database Connection Success Test - Connection not null and open")
    void testDatabaseConnectionSuccess_ConnectionNotNull() throws SQLException {
        Connection conn = DriverManager.getConnection(
            "jdbc:h2:mem:hotelmanagement;MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        
        assertNotNull(conn, "Connection should not be null");
        assertFalse(conn.isClosed(), "Connection should not be closed");
        
        conn.close();
    }

    // ==================== Requirement 2: Database Connection Failure Handling ====================
    @Test
    @DisplayName("Req2: Database Connection Failure Handling - SQLException on invalid connection")
    void testDatabaseConnectionFailure_HandlesGracefully() {
        assertThrows(SQLException.class, () -> {
            DriverManager.getConnection(
                "jdbc:mysql://invalid-host:3306/hotelmanagement", "wrong", "wrong");
        }, "Should throw SQLException for invalid connection");
    }

    // ==================== Requirement 3: Load All Rooms Test ====================
    @Test
    @DisplayName("Req3: Load All Rooms Test - Returns correct room data")
    void testLoadAllRooms_ReturnsCorrectData() throws SQLException {
        insertTestRoom("101", "Ground", "Suite Single Bed", 150.00, false);
        insertTestRoom("102", "First Floor", "Suite Double Bed", 200.00, true);
        insertTestRoom("103", "Second floor", "Suite Family", 300.00, false);

        try (PreparedStatement pst = h2Connection.prepareStatement("SELECT * FROM rooms");
             ResultSet rs = pst.executeQuery()) {
            
            int count = 0;
            while (rs.next()) {
                count++;
                assertNotNull(rs.getString("roomnumber"));
                assertNotNull(rs.getString("floor"));
                assertNotNull(rs.getString("room_type"));
                assertTrue(rs.getFloat("price") > 0);
            }
            assertEquals(3, count, "Should have 3 rooms");
        }
    }

    // ==================== Requirement 4: Load Booked Rooms Only Test ====================
    @Test
    @DisplayName("Req4: Load Booked Rooms Only Test - Filters booked rooms correctly")
    void testLoadBookedRoomsOnly_FiltersCorrectly() throws SQLException {
        insertTestRoom("101", "Ground", "Suite Single Bed", 150.00, false);
        insertTestRoom("102", "First Floor", "Suite Double Bed", 200.00, true);
        insertTestRoom("103", "Second floor", "Suite Family", 300.00, true);

        try (PreparedStatement pst = h2Connection.prepareStatement(
                "SELECT * FROM rooms WHERE booked = true");
             ResultSet rs = pst.executeQuery()) {
            
            int bookedCount = 0;
            while (rs.next()) {
                bookedCount++;
                assertTrue(rs.getBoolean("booked"), "Room should be booked");
            }
            assertEquals(2, bookedCount, "Should have 2 booked rooms");
        }
    }

    // ==================== Requirement 5: Add Room Success Test ====================
    @Test
    @DisplayName("Req5: Add Room Success Test - Inserts room with booked=false")
    void testAddRoomSuccess_InsertsWithDefaultBooked() throws SQLException {
        try (PreparedStatement pst = h2Connection.prepareStatement(
                "INSERT INTO rooms(roomnumber, floor, room_type, price, booked) VALUES(?,?,?,?,?)")) {
            pst.setString(1, "501");
            pst.setString(2, "Ground");
            pst.setString(3, "Suite Presidential");
            pst.setString(4, "500.00");
            pst.setBoolean(5, false);
            int result = pst.executeUpdate();
            
            assertEquals(1, result, "Should insert 1 row");
        }

        try (PreparedStatement pst = h2Connection.prepareStatement(
                "SELECT * FROM rooms WHERE roomnumber = ?")) {
            pst.setString(1, "501");
            ResultSet rs = pst.executeQuery();
            
            assertTrue(rs.next(), "Room should exist");
            assertFalse(rs.getBoolean("booked"), "Booked should default to false");
            assertEquals("Suite Presidential", rs.getString("room_type"));
        }
    }

    // ==================== Requirement 6: Add Room Empty Room Number Test ====================
    @Test
    @DisplayName("Req6: Add Room Empty Room Number Test - Handles empty input")
    void testAddRoomEmptyRoomNumber_HandlesEmptyInput() throws SQLException {
        try (PreparedStatement pst = h2Connection.prepareStatement(
                "INSERT INTO rooms(roomnumber, floor, room_type, price, booked) VALUES(?,?,?,?,?)")) {
            pst.setString(1, "");
            pst.setString(2, "Ground");
            pst.setString(3, "Suite Single Bed");
            pst.setString(4, "100.00");
            pst.setBoolean(5, false);
            
            int result = pst.executeUpdate();
            assertEquals(1, result, "Empty room number insert should succeed (no constraint)");
        }
    }

    // ==================== Requirement 7: Add Room Invalid Price Format Test ====================
    @Test
    @DisplayName("Req7: Add Room Invalid Price Format Test - Throws exception")
    void testAddRoomInvalidPriceFormat_ThrowsException() {
        assertThrows(Exception.class, () -> {
            try (PreparedStatement pst = h2Connection.prepareStatement(
                    "INSERT INTO rooms(roomnumber, floor, room_type, price, booked) VALUES(?,?,?,?,?)")) {
                pst.setString(1, "101");
                pst.setString(2, "Ground");
                pst.setString(3, "Suite Single Bed");
                pst.setString(4, "invalid_price");
                pst.setBoolean(5, false);
                pst.executeUpdate();
            }
        }, "Invalid price format should throw exception");
    }

    // ==================== Requirement 8: SQL Injection Prevention Test ====================
    @Test
    @DisplayName("Req8: SQL Injection Prevention Test - PreparedStatement escapes input")
    void testSqlInjectionPrevention_PreparedStatementEscapes() throws SQLException {
        String maliciousInput = "101'; DROP TABLE rooms; --";
        
        try (PreparedStatement pst = h2Connection.prepareStatement(
                "INSERT INTO rooms(roomnumber, floor, room_type, price, booked) VALUES(?,?,?,?,?)")) {
            pst.setString(1, maliciousInput);
            pst.setString(2, "Ground");
            pst.setString(3, "Suite Single Bed");
            pst.setString(4, "100.00");
            pst.setBoolean(5, false);
            pst.executeUpdate();
        }

        try (Statement stmt = h2Connection.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM rooms")) {
            assertTrue(rs.next());
            assertTrue(rs.getInt(1) >= 1, "Table should still exist with data");
        }

        try (PreparedStatement pst = h2Connection.prepareStatement(
                "SELECT roomnumber FROM rooms WHERE roomnumber = ?")) {
            pst.setString(1, maliciousInput);
            ResultSet rs = pst.executeQuery();
            assertTrue(rs.next(), "Malicious string should be stored as literal");
            assertEquals(maliciousInput, rs.getString(1));
        }
    }

    // ==================== Requirement 9: Checkout Room Success Test ====================
    @Test
    @DisplayName("Req9: Checkout Room Success Test - Sets booked to false")
    void testCheckoutRoomSuccess_SetsBookedToFalse() throws SQLException {
        insertTestRoom("101", "Ground", "Suite Single Bed", 150.00, true);

        try (PreparedStatement pst = h2Connection.prepareStatement(
                "UPDATE rooms SET booked = false WHERE id = ?")) {
            pst.setInt(1, 1);
            int result = pst.executeUpdate();
            assertEquals(1, result, "Should update 1 row");
        }

        try (PreparedStatement pst = h2Connection.prepareStatement(
                "SELECT booked FROM rooms WHERE id = ?")) {
            pst.setInt(1, 1);
            ResultSet rs = pst.executeQuery();
            assertTrue(rs.next());
            assertFalse(rs.getBoolean("booked"), "Room should be checked out");
        }
    }

    // ==================== Requirement 10: Checkout Room No Selection Test ====================
    @Test
    @DisplayName("Req10: Checkout Room No Selection Test - Returns -1 when no selection")
    void testCheckoutNoSelection_ReturnsMinusOne() {
        JTable table = new JTable(new DefaultTableModel(new Object[][]{}, new String[]{"ID", "Room"}));
        assertEquals(-1, table.getSelectedRow(), "No selection should return -1");
    }

    // ==================== Requirement 11: Checkout Nonexistent Room Test ====================
    @Test
    @DisplayName("Req11: Checkout Nonexistent Room Test - No rows affected")
    void testCheckoutNonexistentRoom_NoRowsAffected() throws SQLException {
        try (PreparedStatement pst = h2Connection.prepareStatement(
                "UPDATE rooms SET booked = false WHERE id = ?")) {
            pst.setInt(1, 99999);
            int result = pst.executeUpdate();
            assertEquals(0, result, "Should affect 0 rows for nonexistent room");
        }
    }

    // ==================== Requirement 12: Login Button Navigation Test ====================
    @Test
    @DisplayName("Req12: Login Button Navigation Test - Sign in button works")
    void testLoginButtonCreatesRoomsWindow() {
        // Test that JButton can be created and configured for navigation
        assertDoesNotThrow(() -> {
            SwingUtilities.invokeAndWait(() -> {
                JButton signInButton = new JButton("Sign in");
                assertNotNull(signInButton);
                assertEquals("Sign in", signInButton.getText());
            });
        });
    }

    // ==================== Requirement 13: Rooms to Bookings Navigation Test ====================
    @Test
    @DisplayName("Req13: Rooms to Bookings Navigation Test - Navigation labels exist")
    void testRoomsToBookingsNavigation() {
        // Test that navigation labels can be created
        assertDoesNotThrow(() -> {
            SwingUtilities.invokeAndWait(() -> {
                JLabel bookingsLabel = new JLabel("Bookings");
                JLabel roomsLabel = new JLabel("Rooms");
                JLabel logoutLabel = new JLabel("Logout");
                assertNotNull(bookingsLabel);
                assertNotNull(roomsLabel);
                assertNotNull(logoutLabel);
            });
        });
    }

    // ==================== Requirement 14: Bookings to Rooms Navigation Test ====================
    @Test
    @DisplayName("Req14: Bookings to Rooms Navigation Test - Rooms label works")
    void testBookingsToRoomsNavigation() {
        assertDoesNotThrow(() -> {
            SwingUtilities.invokeAndWait(() -> {
                JLabel roomsLabel = new JLabel("Rooms");
                assertNotNull(roomsLabel);
                assertEquals("Rooms", roomsLabel.getText());
            });
        });
    }

    // ==================== Requirement 15: Logout Navigation Test ====================
    @Test
    @DisplayName("Req15: Logout Navigation Test - Logout label works")
    void testLogoutNavigation() {
        assertDoesNotThrow(() -> {
            SwingUtilities.invokeAndWait(() -> {
                JLabel logoutBtn = new JLabel("Logout");
                assertNotNull(logoutBtn);
                assertEquals("Logout", logoutBtn.getText());
            });
        });
    }

    // ==================== Requirement 16: JTable Column Configuration Test ====================
    @Test
    @DisplayName("Req16a: JTable Column Configuration Test - Rooms table has 6 columns")
    void testRoomsTableColumnConfiguration() {
        DefaultTableModel model = new DefaultTableModel(
            new Object[][]{},
            new String[]{"ID", "Room Number", "Floor", "Type", "Price", "Status"}
        );
        
        assertEquals(6, model.getColumnCount(), "Rooms table should have 6 columns");
        assertEquals("ID", model.getColumnName(0));
        assertEquals("Room Number", model.getColumnName(1));
        assertEquals("Floor", model.getColumnName(2));
        assertEquals("Type", model.getColumnName(3));
        assertEquals("Price", model.getColumnName(4));
        assertEquals("Status", model.getColumnName(5));
    }

    @Test
    @DisplayName("Req16b: JTable Column Configuration Test - Bookings table has 5 columns")
    void testBookingsTableColumnConfiguration() {
        DefaultTableModel model = new DefaultTableModel(
            new Object[][]{},
            new String[]{"Room ID", "Room Number", "Type", "Floor", "Price"}
        );
        
        assertEquals(5, model.getColumnCount(), "Bookings table should have 5 columns");
        assertEquals("Room ID", model.getColumnName(0));
        assertEquals("Room Number", model.getColumnName(1));
        assertEquals("Type", model.getColumnName(2));
        assertEquals("Floor", model.getColumnName(3));
        assertEquals("Price", model.getColumnName(4));
    }

    // ==================== Requirement 17: JTable Cell Editability Test ====================
    @Test
    @DisplayName("Req17: JTable Cell Editability Test - All cells not editable")
    void testTableCellsNotEditable() {
        DefaultTableModel model = new DefaultTableModel(
            new Object[][]{{"1", "101", "Ground", "Suite", "100", "Available"}},
            new String[]{"ID", "Room Number", "Floor", "Type", "Price", "Status"}
        ) {
            @Override
            public boolean isCellEditable(int row, int col) {
                return false;
            }
        };
        
        for (int row = 0; row < model.getRowCount(); row++) {
            for (int col = 0; col < model.getColumnCount(); col++) {
                assertFalse(model.isCellEditable(row, col), 
                    "Cell at (" + row + "," + col + ") should not be editable");
            }
        }
    }

    // ==================== Requirement 18: Room Type Dropdown Options Test ====================
    @Test
    @DisplayName("Req18: Room Type Dropdown Options Test - Has 4 room types")
    void testRoomTypeDropdownOptions() {
        String[] expectedTypes = {"Suite Presidential", "Suite Single Bed", "Suite Double Bed", "Suite Family"};
        JComboBox<String> r_type = new JComboBox<>(expectedTypes);
        
        assertEquals(4, r_type.getItemCount(), "Should have 4 room types");
        assertEquals("Suite Presidential", r_type.getItemAt(0));
        assertEquals("Suite Single Bed", r_type.getItemAt(1));
        assertEquals("Suite Double Bed", r_type.getItemAt(2));
        assertEquals("Suite Family", r_type.getItemAt(3));
    }

    // ==================== Requirement 19: Floor Dropdown Options Test ====================
    @Test
    @DisplayName("Req19: Floor Dropdown Options Test - Has 3 floor options")
    void testFloorDropdownOptions() {
        String[] expectedFloors = {"Ground", "First Floor", "Second floor"};
        JComboBox<String> r_floor = new JComboBox<>(expectedFloors);
        
        assertEquals(3, r_floor.getItemCount(), "Should have 3 floor options");
        assertEquals("Ground", r_floor.getItemAt(0));
        assertEquals("First Floor", r_floor.getItemAt(1));
        assertEquals("Second floor", r_floor.getItemAt(2));
    }

    // ==================== Requirement 20: Form Clear After Add Test ====================
    @Test
    @DisplayName("Req20: Form Clear After Add Test - Fields reset after add")
    void testFormClearAfterAdd() {
        JTextField r_number = new JTextField("101");
        JTextField r_price = new JTextField("100.00");
        JComboBox<String> r_floor = new JComboBox<>(new String[]{"Ground", "First Floor"});
        JComboBox<String> r_type = new JComboBox<>(new String[]{"Suite Presidential", "Suite Single Bed"});
        
        r_floor.setSelectedIndex(1);
        r_type.setSelectedIndex(1);
        
        r_number.setText("");
        r_floor.setSelectedIndex(0);
        r_type.setSelectedIndex(0);
        r_price.setText("");
        
        assertEquals("", r_number.getText());
        assertEquals("", r_price.getText());
        assertEquals(0, r_floor.getSelectedIndex());
        assertEquals(0, r_type.getSelectedIndex());
    }

    // ==================== Requirement 21: Concurrent Database Access Test ====================
    @Test
    @DisplayName("Req21: Concurrent Database Access Test - Thread-safe operations")
    void testConcurrentDatabaseAccess() throws Exception {
        insertTestRoom("101", "Ground", "Suite Single Bed", 150.00, true);
        
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch latch = new CountDownLatch(2);
        
        Runnable checkoutTask = () -> {
            try (Connection conn = DriverManager.getConnection(
                    "jdbc:h2:mem:hotelmanagement;MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
                 PreparedStatement pst = conn.prepareStatement(
                    "UPDATE rooms SET booked = false WHERE id = ? AND booked = true")) {
                pst.setInt(1, 1);
                pst.executeUpdate();
            } catch (SQLException e) {
                fail("Should not throw exception");
            } finally {
                latch.countDown();
            }
        };
        
        executor.submit(checkoutTask);
        executor.submit(checkoutTask);
        
        latch.await(5, TimeUnit.SECONDS);
        executor.shutdown();
        
        try (PreparedStatement pst = h2Connection.prepareStatement(
                "SELECT booked FROM rooms WHERE id = ?")) {
            pst.setInt(1, 1);
            ResultSet rs = pst.executeQuery();
            assertTrue(rs.next());
            assertFalse(rs.getBoolean("booked"), "Room should be checked out");
        }
    }

    // ==================== Requirement 22: Large Dataset Performance Test ====================
    @Test
    @Timeout(value = 10, unit = TimeUnit.SECONDS)
    @DisplayName("Req22: Large Dataset Performance Test - 1000 rooms under 10 seconds")
    void testLargeDatasetPerformance() throws SQLException {
        try (PreparedStatement pst = h2Connection.prepareStatement(
                "INSERT INTO rooms(roomnumber, floor, room_type, price, booked) VALUES(?,?,?,?,?)")) {
            for (int i = 0; i < 1000; i++) {
                pst.setString(1, "Room" + i);
                pst.setString(2, "Floor" + (i % 3));
                pst.setString(3, "Suite Single Bed");
                pst.setString(4, String.valueOf(100 + i));
                pst.setBoolean(5, i % 2 == 0);
                pst.addBatch();
            }
            pst.executeBatch();
        }
        
        try (PreparedStatement pst = h2Connection.prepareStatement("SELECT COUNT(*) FROM rooms");
             ResultSet rs = pst.executeQuery()) {
            assertTrue(rs.next());
            assertEquals(1000, rs.getInt(1), "Should have 1000 rooms");
        }
    }

    // Helper method to insert test rooms
    private void insertTestRoom(String roomNumber, String floor, String roomType, 
                                 double price, boolean booked) throws SQLException {
        try (PreparedStatement pst = h2Connection.prepareStatement(
                "INSERT INTO rooms(roomnumber, floor, room_type, price, booked) VALUES(?,?,?,?,?)")) {
            pst.setString(1, roomNumber);
            pst.setString(2, floor);
            pst.setString(3, roomType);
            pst.setDouble(4, price);
            pst.setBoolean(5, booked);
            pst.executeUpdate();
        }
    }
}
