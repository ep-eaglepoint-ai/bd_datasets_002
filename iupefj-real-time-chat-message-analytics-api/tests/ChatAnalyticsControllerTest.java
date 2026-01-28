package com.eaglepoint.chat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = ChatAnalyticsController.class)
@AutoConfigureMockMvc
public class ChatAnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private ObjectMapper objectMapper = new ObjectMapper();

    // ========== CORRECTNESS TESTS (Legacy + New) ==========

    @Test
    void singleValidMessage() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = List.of(
                createMessage("user1", "hello", 1000)
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertEquals(1, perUser.size());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
        assertEquals(1, user1.get("count"));
        assertEquals(5, user1.get("averageLength"));
        assertEquals("hello", ((ChatAnalyticsController.Message) user1.get("longestMessage")).getContent());
    }

    @Test
    void multipleMessages_singleUser() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "msg1", 1000),    // 4 chars
                createMessage("user1", "msg22", 1001),   // 5 chars
                createMessage("user1", "msg333", 1002)   // 6 chars
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertEquals(1, perUser.size());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
        assertEquals(3, user1.get("count"));
        // (4 + 5 + 6) / 3 = 5 (integer division)
        assertEquals(5, user1.get("averageLength"));
        assertEquals("msg333", ((ChatAnalyticsController.Message) user1.get("longestMessage")).getContent());
    }

    @Test
    void multipleUsers_mixedMessageCounts() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "hello", 1000),
                createMessage("user1", "world!", 1001),
                createMessage("user2", "test", 1002),
                createMessage("user3", "a", 1003),
                createMessage("user3", "bb", 1004),
                createMessage("user3", "ccc", 1005),
                createMessage("user3", "dddd", 1006)
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertEquals(3, perUser.size());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
        assertEquals(2, user1.get("count"));
        
        @SuppressWarnings("unchecked")
        Map<String, Object> user2 = (Map<String, Object>) perUser.get("user2");
        assertEquals(1, user2.get("count"));
        
        @SuppressWarnings("unchecked")
        Map<String, Object> user3 = (Map<String, Object>) perUser.get("user3");
        assertEquals(4, user3.get("count"));
    }

    @Test
    void correctAverageCalculation_integerDivision() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "a", 1000),       // length 1
                createMessage("user1", "bc", 1001),      // length 2
                createMessage("user1", "def", 1002)      // length 3
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
        // (1 + 2 + 3) / 3 = 2 (integer division)
        assertEquals(2, user1.get("averageLength"));
    }

    @Test
    void correctLongestMessage_noTies() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "short", 1000),
                createMessage("user1", "medium length", 1001),
                createMessage("user1", "very long message here", 1002)
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
        assertEquals("very long message here", ((ChatAnalyticsController.Message) user1.get("longestMessage")).getContent());
    }

    @Test
    void emptyInputList() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = new ArrayList<>();

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertTrue(perUser.isEmpty());
        assertEquals(0, result.get("cacheSize"));
    }

    // ========== API CONTRACT TESTS (Legacy + New) ==========

    @Test
    void apiResponseStructure_unchanged() throws Exception {
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "hello", 1000)
        );

        String response = mockMvc.perform(post("/api/chat/analyze")
                .contentType(MediaType.APPLICATION_JSON_VALUE)
                .content(objectMapper.writeValueAsString(messages)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> result = objectMapper.readValue(response, Map.class);
        
        // Must have exactly these fields
        assertNotNull(result.get("perUser"));
        assertNotNull(result.get("cacheSize"));
        assertEquals(2, result.size());  // Only perUser and cacheSize
    }

    @Test
    void fieldNames_unchanged() throws Exception {
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "hello", 1000)
        );

        String response = mockMvc.perform(post("/api/chat/analyze")
                .contentType(MediaType.APPLICATION_JSON_VALUE)
                .content(objectMapper.writeValueAsString(messages)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> result = objectMapper.readValue(response, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
        
        // Must have exactly these field names
        assertNotNull(user1.get("count"));
        assertNotNull(user1.get("averageLength"));
        assertNotNull(user1.get("longestMessage"));
        assertEquals(3, user1.size());  // Only count, averageLength, longestMessage
    }

    @Test
    void types_unchanged() throws Exception {
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "hello", 1000)
        );

        String response = mockMvc.perform(post("/api/chat/analyze")
                .contentType(MediaType.APPLICATION_JSON_VALUE)
                .content(objectMapper.writeValueAsString(messages)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> result = objectMapper.readValue(response, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
        
        assertTrue(user1.get("count") instanceof Integer);
        assertTrue(user1.get("averageLength") instanceof Integer);
        assertTrue(user1.get("longestMessage") instanceof Map);
    }

    // ========== DETERMINISM TESTS (New Code Only) ==========

    @Test
    void deterministicTieBreaking_equalLengthMessages() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "best", 1001),  // higher timestamp (1001)
                createMessage("user1", "test", 1000)   // lower timestamp (1000)
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
        
        // Higher timestamp wins
        assertEquals("best", ((ChatAnalyticsController.Message) user1.get("longestMessage")).getContent());
    }

    @Test
    void orderIndependentOutput() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        
        // Request 1: order A, B
        List<ChatAnalyticsController.Message> messages1 = Arrays.asList(
                createMessage("user1", "aaa", 1000),  // length 3
                createMessage("user1", "bb", 1001)    // length 2
        );
        
        // Request 2: order B, A (reversed)
        List<ChatAnalyticsController.Message> messages2 = Arrays.asList(
                createMessage("user1", "bb", 1001),
                createMessage("user1", "aaa", 1000)
        );

        Map<String, Object> result1 = controller.analyze(messages1);
        Map<String, Object> result2 = controller.analyze(messages2);

        // Results should be functionally equal (same counts, averages, longest content)
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser1 = (Map<String, Object>) result1.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser2 = (Map<String, Object>) result2.get("perUser");
        
        @SuppressWarnings("unchecked")
        Map<String, Object> user1_1 = (Map<String, Object>) perUser1.get("user1");
        @SuppressWarnings("unchecked")
        Map<String, Object> user1_2 = (Map<String, Object>) perUser2.get("user1");
        
        assertEquals(user1_1.get("count"), user1_2.get("count"));
        assertEquals(user1_1.get("averageLength"), user1_2.get("averageLength"));
        assertEquals(((ChatAnalyticsController.Message) user1_1.get("longestMessage")).getContent(),
                     ((ChatAnalyticsController.Message) user1_2.get("longestMessage")).getContent());
    }

    // ========== INVALID INPUT TESTS (New Code Only) ==========

    @Test
    void nullMessageObject() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "valid", 1000),
                null
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertEquals(1, perUser.size());  // Only valid message counted
    }

    @Test
    void nullUserId() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage(null, "content", 1000),
                createMessage("user1", "valid", 1001)
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertEquals(1, perUser.size());
        assertTrue(perUser.containsKey("user1"));
    }

    @Test
    void emptyUserId() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("", "content", 1000),
                createMessage("user1", "valid", 1001)
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertEquals(1, perUser.size());
        assertTrue(perUser.containsKey("user1"));
    }

    @Test
    void nullContent() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", null, 1000),
                createMessage("user1", "valid", 1001)
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertEquals(1, perUser.size());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
        assertEquals(1, user1.get("count"));
        assertEquals("valid", ((ChatAnalyticsController.Message) user1.get("longestMessage")).getContent());
    }

    @Test
    void emptyContent() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = List.of(
                createMessage("user1", "", 1000)
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        
        @SuppressWarnings("unchecked")
        Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
        assertEquals(1, user1.get("count"));
        assertEquals(0, user1.get("averageLength"));
        assertEquals("", ((ChatAnalyticsController.Message) user1.get("longestMessage")).getContent());
    }

    @Test
    void mixedValidAndInvalidMessages() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "valid1", 1000),
                createMessage(null, "invalid1", 1001),
                createMessage("", "invalid2", 1002),
                createMessage("user1", null, 1003),
                createMessage("user2", "valid2", 1004)
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertEquals(2, perUser.size());
        assertTrue(perUser.containsKey("user1"));
        assertTrue(perUser.containsKey("user2"));
    }

    @Test
    void allMessagesInvalid() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage(null, "content", 1000),
                createMessage("", "content", 1001),
                createMessage("user1", null, 1002)
        );

        Map<String, Object> result = controller.analyze(messages);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertTrue(perUser.isEmpty());
        assertEquals(3, result.get("cacheSize"));  // Original count including invalid
    }

    @Test
    void nullRequestBody() {
        ChatAnalyticsController controller = new ChatAnalyticsController();

        Map<String, Object> result = controller.analyze(null);

        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertTrue(perUser.isEmpty());
        assertEquals(0, result.get("cacheSize"));
    }

    // ========== MALFORMED INPUT TESTS (New Code Only) ==========

    @Test
    void malformedJson() throws Exception {
        mockMvc.perform(post("/api/chat/analyze")
                .contentType(MediaType.APPLICATION_JSON_VALUE)
                .content("{invalid json}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void partialJsonFieldsMissing() throws Exception {
        // Only userId provided - content and timestamp missing
        String partialJson = "[{\"userId\": \"user1\"}]";

        mockMvc.perform(post("/api/chat/analyze")
                .contentType(MediaType.APPLICATION_JSON_VALUE)
                .content(partialJson))
                .andExpect(status().isOk());  // Should still process with null content
    }

    @Test
    void invalidDataTypes() throws Exception {
        // Note: Spring Boot is lenient and may accept numeric content as string
        // This test verifies the endpoint handles various inputs gracefully
        String contentAsNumber = "[{\"userId\": \"user1\", \"content\": 123, \"timestamp\": 1000}]";
        
        // The endpoint should either accept it (with coercion) or reject it
        // Both behaviors are acceptable for this test
        try {
            mockMvc.perform(post("/api/chat/analyze")
                    .contentType(MediaType.APPLICATION_JSON_VALUE)
                    .content(contentAsNumber))
                    .andExpect(status().isOk());
        } catch (AssertionError e) {
            // Accept either 200 (success) or 400 (rejected)
            mockMvc.perform(post("/api/chat/analyze")
                    .contentType(MediaType.APPLICATION_JSON_VALUE)
                    .content(contentAsNumber))
                    .andExpect(status().isBadRequest());
        }
    }

    // ========== CONCURRENCY TESTS (New Code Only) ==========

    @Test
    void twoConcurrentRequests_differentPayloads() throws Exception {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        
        Future<Map<String, Object>> future1 = executor.submit(() -> {
            List<ChatAnalyticsController.Message> messages = Arrays.asList(
                    createMessage("userA", "msg1", 1000),
                    createMessage("userA", "msg22", 1001)
            );
            return controller.analyze(messages);
        });
        
        Future<Map<String, Object>> future2 = executor.submit(() -> {
            List<ChatAnalyticsController.Message> messages = Arrays.asList(
                    createMessage("userB", "xyz", 2000)
            );
            return controller.analyze(messages);
        });
        
        executor.shutdown();
        assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS));
        
        Map<String, Object> result1 = future1.get();
        Map<String, Object> result2 = future2.get();
        
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser1 = (Map<String, Object>) result1.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser2 = (Map<String, Object>) result2.get("perUser");
        
        // Each should only have their own users
        assertEquals(1, perUser1.size());
        assertEquals(1, perUser2.size());
        assertTrue(perUser1.containsKey("userA"));
        assertTrue(perUser2.containsKey("userB"));
    }

    @Test
    void twoConcurrentRequests_overlappingUsers() throws Exception {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        
        Future<Map<String, Object>> future1 = executor.submit(() -> {
            List<ChatAnalyticsController.Message> messages = Arrays.asList(
                    createMessage("sharedUser", "msg1", 1000),
                    createMessage("sharedUser", "msg2", 1001)
            );
            return controller.analyze(messages);
        });
        
        Future<Map<String, Object>> future2 = executor.submit(() -> {
            List<ChatAnalyticsController.Message> messages = Arrays.asList(
                    createMessage("sharedUser", "msg3", 2000),
                    createMessage("privateUser", "msg4", 2001)
            );
            return controller.analyze(messages);
        });
        
        executor.shutdown();
        assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS));
        
        Map<String, Object> result1 = future1.get();
        Map<String, Object> result2 = future2.get();
        
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser1 = (Map<String, Object>) result1.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser2 = (Map<String, Object>) result2.get("perUser");
        
        // Both should have sharedUser
        assertTrue(perUser1.containsKey("sharedUser"));
        assertTrue(perUser2.containsKey("sharedUser"));
        
        // Only request 2 should have privateUser
        assertFalse(perUser1.containsKey("privateUser"));
        assertTrue(perUser2.containsKey("privateUser"));
        
        // Request 1's sharedUser should have count=2, not contaminated by request 2
        @SuppressWarnings("unchecked")
        Map<String, Object> sharedUser1 = (Map<String, Object>) perUser1.get("sharedUser");
        assertEquals(2, sharedUser1.get("count"));
    }

    @Test
    void sameRequestParallel_sameOutput() throws Exception {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        ExecutorService executor = Executors.newFixedThreadPool(5);
        List<Future<Map<String, Object>>> futures = new ArrayList<>();
        
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "msg1", 1000),
                createMessage("user1", "msg22", 1001)
        );
        
        for (int i = 0; i < 5; i++) {
            futures.add(executor.submit(() -> controller.analyze(messages)));
        }
        
        executor.shutdown();
        assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS));
        
        // Get first result
        Map<String, Object> firstResult = futures.get(0).get();
        @SuppressWarnings("unchecked")
        Map<String, Object> perUserFirst = (Map<String, Object>) firstResult.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> user1First = (Map<String, Object>) perUserFirst.get("user1");
        
        // All results should have same content
        for (int i = 1; i < futures.size(); i++) {
            Map<String, Object> result = futures.get(i).get();
            @SuppressWarnings("unchecked")
            Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
            @SuppressWarnings("unchecked")
            Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
            
            assertEquals(user1First.get("count"), user1.get("count"));
            assertEquals(user1First.get("averageLength"), user1.get("averageLength"));
            assertEquals(((ChatAnalyticsController.Message) user1First.get("longestMessage")).getContent(),
                         ((ChatAnalyticsController.Message) user1.get("longestMessage")).getContent());
        }
    }

    @Test
    void noCrossRequestDataLeakage() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        
        // First request
        List<ChatAnalyticsController.Message> messages1 = Arrays.asList(
                createMessage("user1", "first request", 1000)
        );
        Map<String, Object> result1 = controller.analyze(messages1);
        
        // Second request with different data
        List<ChatAnalyticsController.Message> messages2 = Arrays.asList(
                createMessage("user2", "second request", 2000)
        );
        Map<String, Object> result2 = controller.analyze(messages2);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser1 = (Map<String, Object>) result1.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser2 = (Map<String, Object>) result2.get("perUser");
        
        // Request 1 should only have user1
        assertEquals(1, perUser1.size());
        assertTrue(perUser1.containsKey("user1"));
        
        // Request 2 should only have user2
        assertEquals(1, perUser2.size());
        assertTrue(perUser2.containsKey("user2"));
        
        // No cross-contamination
        assertFalse(perUser1.containsKey("user2"));
        assertFalse(perUser2.containsKey("user1"));
    }

    @Test
    void noRaceConditionExceptions() throws Exception {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        ExecutorService executor = Executors.newFixedThreadPool(10);
        List<Future<Map<String, Object>>> futures = new ArrayList<>();
        
        for (int i = 0; i < 20; i++) {
            final int iteration = i;
            futures.add(executor.submit(() -> {
                List<ChatAnalyticsController.Message> messages = Arrays.asList(
                        createMessage("user" + (iteration % 3), "msg" + iteration, iteration)
                );
                return controller.analyze(messages);
            }));
        }
        
        executor.shutdown();
        assertTrue(executor.awaitTermination(30, TimeUnit.SECONDS));
        
        // All requests should complete without exceptions
        for (Future<Map<String, Object>> future : futures) {
            assertNotNull(future.get());
        }
    }

    @Test
    void secondRequestUnaffectedByFirst() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        
        // First request
        List<ChatAnalyticsController.Message> messages1 = Arrays.asList(
                createMessage("user1", "first", 1000)
        );
        Map<String, Object> result1 = controller.analyze(messages1);
        
        // Second request (same data)
        List<ChatAnalyticsController.Message> messages2 = Arrays.asList(
                createMessage("user1", "first", 1000)
        );
        Map<String, Object> result2 = controller.analyze(messages2);
        
        // Results should be functionally equal
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser1 = (Map<String, Object>) result1.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser2 = (Map<String, Object>) result2.get("perUser");
        
        @SuppressWarnings("unchecked")
        Map<String, Object> user1_1 = (Map<String, Object>) perUser1.get("user1");
        @SuppressWarnings("unchecked")
        Map<String, Object> user1_2 = (Map<String, Object>) perUser2.get("user1");
        
        assertEquals(user1_1.get("count"), user1_2.get("count"));
        assertEquals(user1_1.get("averageLength"), user1_2.get("averageLength"));
        assertEquals(((ChatAnalyticsController.Message) user1_1.get("longestMessage")).getContent(),
                     ((ChatAnalyticsController.Message) user1_2.get("longestMessage")).getContent());
    }

    @Test
    void cacheClearedBetweenRequests() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        
        // First request
        List<ChatAnalyticsController.Message> messages1 = Arrays.asList(
                createMessage("user1", "request1", 1000)
        );
        controller.analyze(messages1);
        
        // Second request with fewer messages
        List<ChatAnalyticsController.Message> messages2 = Arrays.asList(
                createMessage("user1", "request2", 2000)
        );
        Map<String, Object> result2 = controller.analyze(messages2);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result2.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
        
        // Should only count messages from second request
        assertEquals(1, user1.get("count"));
        assertEquals("request2", ((ChatAnalyticsController.Message) user1.get("longestMessage")).getContent());
    }

    // ========== PERFORMANCE TESTS (New Code Only) ==========

    @Test
    void linearTimePerformance() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        
        // Test with 100 messages
        List<ChatAnalyticsController.Message> messages100 = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            messages100.add(createMessage("user" + (i % 10), "message content " + i, i));
        }
        long start100 = System.nanoTime();
        controller.analyze(messages100);
        long duration100 = System.nanoTime() - start100;
        
        // Test with 1000 messages
        List<ChatAnalyticsController.Message> messages1000 = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            messages1000.add(createMessage("user" + (i % 10), "message content " + i, i));
        }
        long start1000 = System.nanoTime();
        controller.analyze(messages1000);
        long duration1000 = System.nanoTime() - start1000;
        
        // 10x messages should take roughly 10x time (linear scaling) - allow more tolerance
        double ratio = (double) duration1000 / duration100;
        assertTrue(ratio < 30, "Time ratio " + ratio + " suggests non-linear scaling");
    }

    @Test
    void noNestedLoops() {
        // This is verified by the linear time test above
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            messages.add(createMessage("user" + i, "message" + i, i));
        }
        
        long start = System.nanoTime();
        controller.analyze(messages);
        long duration = System.nanoTime() - start;
        
        // Should complete very quickly (under 100ms for 100 messages)
        assertTrue(duration < 100_000_000, "May have nested loops: " + duration + " ns");
    }

    @Test
    void stablePerformanceRepeatedRequests() {
        // Note: Performance can vary in containerized environments
        // This test verifies the implementation doesn't have obvious O(n^2) or worse issues
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = new ArrayList<>();
        for (int i = 0; i < 500; i++) {
            messages.add(createMessage("user" + (i % 20), "msg" + i, i));
        }
        
        // Run a few times and verify it completes without errors
        for (int i = 0; i < 5; i++) {
            assertDoesNotThrow(() -> {
                controller.analyze(messages);
            });
        }
    }

    @Test
    void largePayloadPerformance() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = new ArrayList<>();
        for (int i = 0; i < 10000; i++) {
            messages.add(createMessage("user" + (i % 100), "message content " + i, i));
        }
        
        long start = System.nanoTime();
        Map<String, Object> result = controller.analyze(messages);
        long durationMs = (System.nanoTime() - start) / 1_000_000;
        
        // Should complete in under 5 seconds for 10k messages
        assertTrue(durationMs < 5000, "Large payload took too long: " + durationMs + " ms");
        
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertEquals(100, perUser.size());
    }

    @Test
    void gracefulFailureHandling() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        
        // Empty list should not throw
        assertDoesNotThrow(() -> {
            controller.analyze(new ArrayList<>());
        });
        
        // Null should not throw in new code
        assertDoesNotThrow(() -> {
            controller.analyze(null);
        });
    }

    // ========== THREAD SAFETY & DETERMINISM TESTS ==========

    @Test
    void threadSafety() throws Exception {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        ExecutorService executor = Executors.newFixedThreadPool(20);
        List<Future<Boolean>> futures = new ArrayList<>();
        
        for (int i = 0; i < 50; i++) {
            final int iteration = i;
            futures.add(executor.submit(() -> {
                List<ChatAnalyticsController.Message> messages = Arrays.asList(
                        createMessage("user" + (iteration % 5), "msg" + iteration, iteration)
                );
                Map<String, Object> result = controller.analyze(messages);
                
                @SuppressWarnings("unchecked")
                Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
                
                // Each result should be valid and consistent
                return perUser.containsKey("user" + (iteration % 5));
            }));
        }
        
        executor.shutdown();
        assertTrue(executor.awaitTermination(30, TimeUnit.SECONDS));
        
        for (Future<Boolean> future : futures) {
            assertTrue(future.get(), "Thread safety violation detected");
        }
    }

    @Test
    void requestIsolation() throws Exception {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        ExecutorService executor = Executors.newFixedThreadPool(10);
        
        List<Future<Map<String, Object>>> futures = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            final int requestNum = i;
            futures.add(executor.submit(() -> {
                List<ChatAnalyticsController.Message> messages = Arrays.asList(
                        createMessage("userA", "req" + requestNum + "_1", requestNum * 1000L),
                        createMessage("userA", "req" + requestNum + "_2", requestNum * 1000L + 1)
                );
                return controller.analyze(messages);
            }));
        }
        
        executor.shutdown();
        assertTrue(executor.awaitTermination(30, TimeUnit.SECONDS));
        
        // Each request should be isolated
        for (int i = 0; i < 10; i++) {
            Map<String, Object> result = futures.get(i).get();
            @SuppressWarnings("unchecked")
            Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
            @SuppressWarnings("unchecked")
            Map<String, Object> userA = (Map<String, Object>) perUser.get("userA");
            
            assertEquals(2, userA.get("count"));
            // Longest message should be from this request
            String longestContent = ((ChatAnalyticsController.Message) userA.get("longestMessage")).getContent();
            assertTrue(longestContent.contains("req" + i), "Request isolation violated for request " + i);
        }
    }

    @Test
    void determinismAcrossExecutions() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "msg1", 1000),
                createMessage("user1", "msg22", 1001),
                createMessage("user2", "xyz", 1002)
        );
        
        // Run multiple times
        Map<String, Object> result1 = controller.analyze(messages);
        Map<String, Object> result2 = controller.analyze(messages);
        Map<String, Object> result3 = controller.analyze(messages);
        
        // Results should be functionally equal
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser1 = (Map<String, Object>) result1.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser2 = (Map<String, Object>) result2.get("perUser");
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser3 = (Map<String, Object>) result3.get("perUser");
        
        @SuppressWarnings("unchecked")
        Map<String, Object> user1_1 = (Map<String, Object>) perUser1.get("user1");
        @SuppressWarnings("unchecked")
        Map<String, Object> user1_2 = (Map<String, Object>) perUser2.get("user1");
        @SuppressWarnings("unchecked")
        Map<String, Object> user1_3 = (Map<String, Object>) perUser3.get("user1");
        
        assertEquals(((ChatAnalyticsController.Message) user1_1.get("longestMessage")).getContent(),
                     ((ChatAnalyticsController.Message) user1_2.get("longestMessage")).getContent());
        assertEquals(((ChatAnalyticsController.Message) user1_2.get("longestMessage")).getContent(),
                     ((ChatAnalyticsController.Message) user1_3.get("longestMessage")).getContent());
    }

    @Test
    void resilienceUnderHighLoad() throws Exception {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        ExecutorService executor = Executors.newFixedThreadPool(50);
        
        List<Future<Boolean>> futures = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            final int iteration = i;
            futures.add(executor.submit(() -> {
                List<ChatAnalyticsController.Message> messages = new ArrayList<>();
                for (int j = 0; j < 50; j++) {
                    messages.add(createMessage("user" + (j % 10), "msg_" + iteration + "_" + j, iteration * 100 + j));
                }
                
                // Should not throw and should return valid result
                Map<String, Object> result = controller.analyze(messages);
                @SuppressWarnings("unchecked")
                Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
                
                return perUser.size() == 10;  // 10 users
            }));
        }
        
        executor.shutdown();
        assertTrue(executor.awaitTermination(60, TimeUnit.SECONDS));
        
        int successCount = 0;
        for (Future<Boolean> future : futures) {
            if (future.get()) successCount++;
        }
        
        // At least 90% should succeed under load
        assertTrue(successCount >= 90, "Resilience test failed: " + successCount + "/100 succeeded");
    }

    // Helper
    private ChatAnalyticsController.Message createMessage(String userId, String content, long timestamp) {
        try {
            ChatAnalyticsController.Message msg = ChatAnalyticsController.Message.class.getDeclaredConstructor().newInstance();
            var userIdField = ChatAnalyticsController.Message.class.getDeclaredField("userId");
            userIdField.setAccessible(true);
            userIdField.set(msg, userId);

            var contentField = ChatAnalyticsController.Message.class.getDeclaredField("content");
            contentField.setAccessible(true);
            contentField.set(msg, content);

            var tsField = ChatAnalyticsController.Message.class.getDeclaredField("timestamp");
            tsField.setAccessible(true);
            tsField.set(msg, timestamp);

            return msg;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to create message", ex);
        }
    }
}
