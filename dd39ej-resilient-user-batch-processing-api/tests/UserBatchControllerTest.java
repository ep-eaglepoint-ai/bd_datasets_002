package com.example.users;

import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import java.lang.reflect.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class UserBatchControllerTest {
    
    private Object controller;
    private Method processMethod;
    private Class<?> userClass;
    
    @BeforeEach
    void setUp() throws Exception {
        Class<?> controllerClass = Class.forName("com.example.users.UserBatchController");
        controller = controllerClass.getDeclaredConstructor().newInstance();
        processMethod = controllerClass.getMethod("process", List.class);
        
        for (Class<?> innerClass : controllerClass.getDeclaredClasses()) {
            if (innerClass.getSimpleName().equals("User")) {
                userClass = innerClass;
                break;
            }
        }
    }
    
    private Object createUser(String id, String email) throws Exception {
        Object user = userClass.getDeclaredConstructor().newInstance();
        
        Field idField = userClass.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(user, id);
        
        Field emailField = userClass.getDeclaredField("email");
        emailField.setAccessible(true);
        emailField.set(user, email);
        
        return user;
    }
    
    @SuppressWarnings("unchecked")
    private Map<String, Object> invokeProcess(List<?> users) throws Exception {
        return (Map<String, Object>) processMethod.invoke(controller, users);
    }
    
    @SuppressWarnings("unchecked")
    private List<Object> createUserList(Object... users) {
        List<Object> list = new ArrayList<>();
        for (Object user : users) {
            list.add(user);
        }
        return list;
    }

    // Requirement 1: Process valid users only if id is not null or empty
    @Test
    @Order(1)
    @DisplayName("R1: Process valid users with non-null non-empty id")
    void testR1_ProcessValidUsers() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "user1@example.com"),
            createUser("user2", "user2@example.com"),
            createUser("user3", "user3@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertEquals(3, result.get("processedCount"));
        List<String> ids = (List<String>) result.get("processedIds");
        assertTrue(ids.contains("user1"));
        assertTrue(ids.contains("user2"));
        assertTrue(ids.contains("user3"));
    }
    
    @Test
    @Order(2)
    @DisplayName("R1: Do not process users with null id")
    void testR1_RejectNullId() throws Exception {
        List<Object> users = createUserList(
            createUser(null, "valid@example.com"),
            createUser("user2", "user2@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertEquals(1, result.get("processedCount"));
        List<String> ids = (List<String>) result.get("processedIds");
        assertFalse(ids.contains(null));
        assertTrue(ids.contains("user2"));
    }
    
    @Test
    @Order(3)
    @DisplayName("R1: Do not process users with empty id")
    void testR1_RejectEmptyId() throws Exception {
        List<Object> users = createUserList(
            createUser("", "valid@example.com"),
            createUser("user2", "user2@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertEquals(1, result.get("processedCount"));
    }

    // Requirement 2: Report invalid users without failing batch
    @Test
    @Order(4)
    @DisplayName("R2: Report invalid email without failing")
    void testR2_ReportInvalidEmailNoFail() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "invalid-email"),
            createUser("user2", "user2@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertEquals(1, result.get("processedCount"));
        assertNotNull(result.get("invalidUsers"));
    }
    
    @Test
    @Order(5)
    @DisplayName("R2: Report null id users without failing")
    void testR2_ReportNullIdNoFail() throws Exception {
        List<Object> users = createUserList(
            createUser(null, "valid@example.com"),
            createUser("user2", "user2@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertEquals(1, result.get("processedCount"));
        assertTrue(result.containsKey("invalidUsers"));
    }
    
    @Test
    @Order(6)
    @DisplayName("R2: Preserve original input order")
    void testR2_PreserveOrder() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "user1@example.com"),
            createUser("user2", "user2@example.com"),
            createUser("user3", "user3@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        List<String> ids = (List<String>) result.get("processedIds");
        assertEquals("user1", ids.get(0));
        assertEquals("user2", ids.get(1));
        assertEquals("user3", ids.get(2));
    }

    // Requirement 3: Duplicate invalid users reported once
    @Test
    @Order(7)
    @DisplayName("R3: Report duplicate invalid user only once")
    void testR3_DuplicateInvalidOnce() throws Exception {
        List<Object> users = createUserList(
            createUser("dup1", "invalid1"),
            createUser("dup1", "invalid2"),
            createUser("user2", "user2@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        List<Map<String, String>> invalidUsers = (List<Map<String, String>>) result.get("invalidUsers");
        
        long dup1Count = 0;
        for (Map<String, String> invalid : invalidUsers) {
            if ("dup1".equals(invalid.get("id"))) {
                dup1Count++;
            }
        }
        
        assertEquals(1, dup1Count);
    }
    
    @Test
    @Order(8)
    @DisplayName("R3: Process valid users with same id as invalid")
    void testR3_ProcessValidWithSameId() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "invalid"),
            createUser("user1", "user1@example.com"),
            createUser("user2", "user2@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        List<String> ids = (List<String>) result.get("processedIds");
        assertTrue(ids.contains("user1"));
        assertTrue(ids.contains("user2"));
    }

    // Requirement 4: Return count of valid users
    @Test
    @Order(9)
    @DisplayName("R4: Return correct valid user count")
    void testR4_ValidUserCount() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "user1@example.com"),
            createUser("user2", "invalid"),
            createUser("user3", "user3@example.com"),
            createUser("user4", "user4@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertEquals(3, result.get("processedCount"));
    }

    // Requirement 5: Return IDs of valid users
    @Test
    @Order(10)
    @DisplayName("R5: Return valid user IDs")
    void testR5_ValidUserIds() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "user1@example.com"),
            createUser("user2", "invalid"),
            createUser("user3", "user3@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertTrue(result.containsKey("processedIds"));
        List<String> ids = (List<String>) result.get("processedIds");
        assertEquals(2, ids.size());
        assertTrue(ids.contains("user1"));
        assertTrue(ids.contains("user3"));
    }

    // Requirement 6: Return count of invalid users
    @Test
    @Order(11)
    @DisplayName("R6: Return invalid user count")
    void testR6_InvalidUserCount() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "user1@example.com"),
            createUser("user2", "invalid"),
            createUser(null, "nullid@example.com"),
            createUser("user4", "user4@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertTrue(result.containsKey("invalidCount"));
        assertEquals(2, result.get("invalidCount"));
    }

    // Requirement 7: Return invalid user details with reason
    @Test
    @Order(12)
    @DisplayName("R7: Return invalid details with email reason")
    void testR7_InvalidDetailsEmailReason() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "invalid-email")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        List<Map<String, String>> invalidUsers = (List<Map<String, String>>) result.get("invalidUsers");
        assertFalse(invalidUsers.isEmpty());
        
        Map<String, String> invalid = invalidUsers.get(0);
        assertEquals("user1", invalid.get("id"));
        assertNotNull(invalid.get("reason"));
        assertTrue(invalid.get("reason").toLowerCase().contains("email"));
    }
    
    @Test
    @Order(13)
    @DisplayName("R7: Return invalid details with id reason")
    void testR7_InvalidDetailsIdReason() throws Exception {
        List<Object> users = createUserList(
            createUser(null, "valid@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        List<Map<String, String>> invalidUsers = (List<Map<String, String>>) result.get("invalidUsers");
        assertFalse(invalidUsers.isEmpty());
        
        Map<String, String> invalid = invalidUsers.get(0);
        assertNotNull(invalid.get("reason"));
        String reason = invalid.get("reason").toLowerCase();
        assertTrue(reason.contains("id") || reason.contains("null") || reason.contains("empty"));
    }

    // Requirement 8: No exceptions inside loop
    @Test
    @Order(14)
    @DisplayName("R8: No exceptions thrown for invalid data")
    void testR8_NoExceptions() throws Exception {
        List<Object> users = createUserList(
            createUser(null, null),
            createUser("", ""),
            createUser("user1", "invalid"),
            createUser("user2", null),
            createUser("user3", "user3@example.com")
        );
        
        assertDoesNotThrow(() -> invokeProcess(users));
    }
    
    @Test
    @Order(15)
    @DisplayName("R8: Process all users with mixed data")
    void testR8_ProcessMixedData() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "invalid1"),
            createUser("user2", "invalid2"),
            createUser("user3", "user3@example.com"),
            createUser("user4", "invalid4"),
            createUser("user5", "user5@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertEquals(2, result.get("processedCount"));
        assertEquals(3, result.get("invalidCount"));
    }

    // Requirement 9: No short-circuit on failure
    @Test
    @Order(16)
    @DisplayName("R9: Continue after invalid user")
    void testR9_ContinueAfterInvalid() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "invalid"),
            createUser("user2", "user2@example.com"),
            createUser("user3", "user3@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        List<String> ids = (List<String>) result.get("processedIds");
        assertEquals(2, ids.size());
        assertTrue(ids.contains("user2"));
        assertTrue(ids.contains("user3"));
    }
    
    @Test
    @Order(17)
    @DisplayName("R9: Process last user after multiple failures")
    void testR9_ProcessAfterMultipleFailures() throws Exception {
        List<Object> users = createUserList(
            createUser("inv1", "invalid1"),
            createUser("inv2", "invalid2"),
            createUser("inv3", "invalid3"),
            createUser("valid1", "valid1@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        List<String> ids = (List<String>) result.get("processedIds");
        assertTrue(ids.contains("valid1"));
    }

    // Requirement 10: No streams
    @Test
    @Order(18)
    @DisplayName("R10: Works without stream API")
    void testR10_NoStreams() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "user1@example.com"),
            createUser("user2", "user2@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertEquals(2, result.get("processedCount"));
    }

    // Requirement 11: Separate validation from processing
    @Test
    @Order(19)
    @DisplayName("R11: Separate validation logic")
    void testR11_SeparatedValidation() throws Exception {
        List<Object> users = createUserList(
            createUser(null, "valid@example.com"),
            createUser("user2", "invalid-email")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        List<Map<String, String>> invalidUsers = (List<Map<String, String>>) result.get("invalidUsers");
        assertEquals(2, invalidUsers.size());
        
        String reason1 = invalidUsers.get(0).get("reason");
        String reason2 = invalidUsers.get(1).get("reason");
        
        assertNotNull(reason1);
        assertNotNull(reason2);
        assertNotEquals(reason1, reason2);
    }

    // Requirement 12: Detect duplicates without sets/maps
    @Test
    @Order(20)
    @DisplayName("R12: Detect duplicates correctly")
    void testR12_DetectDuplicates() throws Exception {
        List<Object> users = createUserList(
            createUser("dup1", "invalid1"),
            createUser("dup1", "invalid2"),
            createUser("dup1", "invalid3"),
            createUser("valid1", "valid1@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        List<Map<String, String>> invalidUsers = (List<Map<String, String>>) result.get("invalidUsers");
        
        long dup1Count = 0;
        for (Map<String, String> invalid : invalidUsers) {
            if ("dup1".equals(invalid.get("id"))) {
                dup1Count++;
            }
        }
        
        assertEquals(1, dup1Count);
    }

    // Edge Cases
    @Test
    @Order(21)
    @DisplayName("Edge: Empty list")
    void testEdge_EmptyList() throws Exception {
        List<Object> users = new ArrayList<>();
        
        Map<String, Object> result = invokeProcess(users);
        
        assertEquals(0, result.get("processedCount"));
        assertEquals(0, result.get("invalidCount"));
    }
    
    @Test
    @Order(22)
    @DisplayName("Edge: All valid")
    void testEdge_AllValid() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "user1@example.com"),
            createUser("user2", "user2@example.com"),
            createUser("user3", "user3@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertEquals(3, result.get("processedCount"));
        assertEquals(0, result.get("invalidCount"));
    }
    
    @Test
    @Order(23)
    @DisplayName("Edge: All invalid")
    void testEdge_AllInvalid() throws Exception {
        List<Object> users = createUserList(
            createUser("user1", "invalid1"),
            createUser("user2", "invalid2"),
            createUser(null, "valid@example.com")
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertEquals(0, result.get("processedCount"));
        assertEquals(3, result.get("invalidCount"));
    }
    
    @Test
    @Order(24)
    @DisplayName("Integration: Complex mixed scenario")
    void testIntegration_ComplexMixed() throws Exception {
        List<Object> users = createUserList(
            createUser("valid1", "valid1@example.com"),
            createUser("invalid1", "bad-email"),
            createUser(null, "null-id@example.com"),
            createUser("valid2", "valid2@example.com"),
            createUser("invalid1", "another-bad"),
            createUser("", "empty-id@example.com"),
            createUser("valid3", "valid3@example.com"),
            createUser("invalid2", null)
        );
        
        Map<String, Object> result = invokeProcess(users);
        
        assertEquals(3, result.get("processedCount"));
        assertEquals(4, result.get("invalidCount"));
        
        List<String> ids = (List<String>) result.get("processedIds");
        assertTrue(ids.contains("valid1"));
        assertTrue(ids.contains("valid2"));
        assertTrue(ids.contains("valid3"));
    }
}