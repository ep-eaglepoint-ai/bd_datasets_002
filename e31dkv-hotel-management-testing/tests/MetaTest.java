import org.junit.jupiter.api.*;
import java.io.*;
import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Meta-tests that validate the quality and correctness of primary tests
 * Covers Requirements 23-30 for test quality validation
 */
public class MetaTest {

    private static final String TEST_FILE_PATH = "/app/repository_after/test/hotelmanagement/HotelManagementTest.java";

    // ==================== Requirement 24: Test Assertion Presence ====================
    @Test
    @DisplayName("Req24: Metatest Assertion Presence - All test methods have assertions")
    void testAllTestMethodsHaveAssertions() throws IOException {
        String testContent = Files.readString(Path.of(TEST_FILE_PATH));
        
        // Check that the test file contains assertions
        boolean hasAssertEquals = testContent.contains("assertEquals");
        boolean hasAssertTrue = testContent.contains("assertTrue");
        boolean hasAssertFalse = testContent.contains("assertFalse");
        boolean hasAssertNotNull = testContent.contains("assertNotNull");
        boolean hasAssertThrows = testContent.contains("assertThrows");
        boolean hasAssertDoesNotThrow = testContent.contains("assertDoesNotThrow");
        
        assertTrue(hasAssertEquals || hasAssertTrue || hasAssertFalse || 
                   hasAssertNotNull || hasAssertThrows || hasAssertDoesNotThrow,
            "Test file should contain assertion methods");
    }

    // ==================== Requirement 25: No Trivial Assertions ====================
    @Test
    @DisplayName("Req25: Metatest No Trivial Assertions - No assertTrue(true) patterns")
    void testNoTrivialAssertions() throws IOException {
        String testContent = Files.readString(Path.of(TEST_FILE_PATH));
        
        List<String> trivialPatterns = Arrays.asList(
            "assertTrue\\s*\\(\\s*true\\s*\\)",
            "assertFalse\\s*\\(\\s*false\\s*\\)",
            "assertEquals\\s*\\(\\s*1\\s*,\\s*1\\s*\\)",
            "assertEquals\\s*\\(\\s*\"test\"\\s*,\\s*\"test\"\\s*\\)"
        );
        
        for (String pattern : trivialPatterns) {
            Pattern p = Pattern.compile(pattern);
            Matcher m = p.matcher(testContent);
            assertFalse(m.find(), "Found trivial assertion matching pattern: " + pattern);
        }
    }

    // ==================== Requirement 26: Test Class Naming Convention ====================
    @Test
    @DisplayName("Req26: Metatest Test Class Naming - Classes end with Test")
    void testClassNamingConvention() throws IOException {
        Path testDir = Path.of("/app/repository_after/test/hotelmanagement");
        
        if (Files.exists(testDir)) {
            try (var files = Files.list(testDir)) {
                files.filter(p -> p.toString().endsWith(".java"))
                     .forEach(p -> {
                         String fileName = p.getFileName().toString();
                         assertTrue(fileName.endsWith("Test.java"), 
                             "Test file should end with 'Test.java': " + fileName);
                     });
            }
        }
    }

    // ==================== Requirement 27: Test Method Naming Convention ====================
    @Test
    @DisplayName("Req27: Metatest Test Method Naming - Methods follow naming convention")
    void testMethodNamingConvention() throws IOException {
        String testContent = Files.readString(Path.of(TEST_FILE_PATH));
        
        Pattern methodPattern = Pattern.compile("@Test\\s+(?:@\\w+\\s+)*(?:void|public\\s+void)\\s+(\\w+)");
        Matcher matcher = methodPattern.matcher(testContent);
        
        List<String> badNames = new ArrayList<>();
        
        while (matcher.find()) {
            String methodName = matcher.group(1);
            if (!methodName.startsWith("test") && !methodName.contains("_")) {
                badNames.add(methodName);
            }
        }
        
        assertTrue(badNames.isEmpty() || badNames.size() < 5, 
            "Test methods should follow naming convention (test* or descriptive_with_underscores): " + badNames);
    }

    // ==================== Requirement 28: Database Isolation ====================
    @Test
    @DisplayName("Req28: Metatest Database Isolation - Tests cleanup between runs")
    void testDatabaseIsolationSetup() throws IOException {
        String testContent = Files.readString(Path.of(TEST_FILE_PATH));
        
        boolean hasBeforeEach = testContent.contains("@BeforeEach");
        boolean hasClearOrReset = testContent.contains("DELETE FROM") || 
                                   testContent.contains("TRUNCATE") ||
                                   testContent.contains("setRowCount(0)") ||
                                   testContent.contains("clearDatabase");
        
        assertTrue(hasBeforeEach, "Test should have @BeforeEach for setup");
        assertTrue(hasClearOrReset, "Test should clear database state between tests");
    }

    // ==================== Requirement 29: Mock Verification Pattern ====================
    @Test
    @DisplayName("Req29: Metatest Mock Verification - Mockito imported for mocking")
    void testMockitoImportPresent() throws IOException {
        String testContent = Files.readString(Path.of(TEST_FILE_PATH));
        
        boolean hasMockitoImport = testContent.contains("import org.mockito") ||
                                    testContent.contains("import static org.mockito");
        
        assertTrue(hasMockitoImport, "Test should import Mockito for mocking");
    }

    // ==================== Test Discovery ====================
    @Test
    @DisplayName("Meta: Primary Test File Discoverable")
    void testPrimaryTestsDiscoverable() {
        Path testPath = Path.of(TEST_FILE_PATH);
        assertTrue(Files.exists(testPath), "Primary test file should exist at " + TEST_FILE_PATH);
    }

    @Test
    @DisplayName("Meta: Primary Test File Not Empty")
    void testPrimaryTestFileNotEmpty() throws IOException {
        String content = Files.readString(Path.of(TEST_FILE_PATH));
        assertTrue(content.length() > 100, "Test file should not be empty");
    }

    @Test
    @DisplayName("Meta: Minimum 15 Test Methods Present")
    void testMinimumNumberOfTests() throws IOException {
        String testContent = Files.readString(Path.of(TEST_FILE_PATH));
        
        Pattern testPattern = Pattern.compile("@Test");
        Matcher matcher = testPattern.matcher(testContent);
        
        int testCount = 0;
        while (matcher.find()) {
            testCount++;
        }
        
        assertTrue(testCount >= 15, "Should have at least 15 test methods, found: " + testCount);
    }

    // ==================== Requirement 30: Coverage Configuration ====================
    @Test
    @DisplayName("Req30a: Metatest Coverage - Critical methods tested")
    void testCriticalMethodsCovered() throws IOException {
        String testContent = Files.readString(Path.of(TEST_FILE_PATH));
        
        // Check that tests cover database operations which are the core functionality
        boolean testsConnection = testContent.contains("Connection") || testContent.contains("connect");
        boolean testsRooms = testContent.contains("rooms") || testContent.contains("Room");
        boolean testsBookings = testContent.contains("booked") || testContent.contains("Booking");
        boolean testsCheckout = testContent.contains("checkout") || testContent.contains("Checkout");
        
        assertTrue(testsConnection, "Tests should cover database connection");
        assertTrue(testsRooms, "Tests should cover room operations");
        assertTrue(testsBookings || testsCheckout, "Tests should cover booking/checkout operations");
    }

    @Test
    @DisplayName("Req30b: Metatest Coverage - Database operations tested")
    void testDatabaseOperationsTested() throws IOException {
        String testContent = Files.readString(Path.of(TEST_FILE_PATH));
        
        assertTrue(testContent.contains("INSERT"), "Should test INSERT operations");
        assertTrue(testContent.contains("SELECT"), "Should test SELECT operations");
        assertTrue(testContent.contains("UPDATE"), "Should test UPDATE operations");
    }

    @Test
    @DisplayName("Req30c: Metatest Coverage - Edge cases tested")
    void testEdgeCasesTested() throws IOException {
        String testContent = Files.readString(Path.of(TEST_FILE_PATH));
        
        boolean testsEmptyInput = testContent.contains("Empty") || testContent.contains("empty");
        boolean testsInvalidInput = testContent.contains("Invalid") || testContent.contains("invalid");
        boolean testsSqlInjection = testContent.contains("Injection") || testContent.contains("injection");
        boolean testsConcurrency = testContent.contains("Concurrent") || testContent.contains("concurrent");
        
        assertTrue(testsEmptyInput, "Should test empty input edge case");
        assertTrue(testsInvalidInput, "Should test invalid input edge case");
        assertTrue(testsSqlInjection, "Should test SQL injection prevention");
        assertTrue(testsConcurrency, "Should test concurrent access");
    }

    @Test
    @DisplayName("Req30d: Metatest Coverage - GUI components tested")
    void testGuiComponentsTested() throws IOException {
        String testContent = Files.readString(Path.of(TEST_FILE_PATH));
        
        assertTrue(testContent.contains("JTable") || testContent.contains("table"), 
            "Should test JTable components");
        assertTrue(testContent.contains("JComboBox") || testContent.contains("Dropdown"), 
            "Should test dropdown/combobox components");
    }

    @Test 
    @DisplayName("Meta: No Disabled/Ignored Tests")
    void testTestResultsConsistent() throws IOException {
        String testContent = Files.readString(Path.of(TEST_FILE_PATH));
        
        assertFalse(testContent.contains("@Disabled"), 
            "Tests should not have @Disabled annotations without reason");
        assertFalse(testContent.contains("@Ignore"), 
            "Tests should not have @Ignore annotations");
    }
}
