package com.eaglepoint.chat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = ChatAnalyticsController.class)
@AutoConfigureMockMvc
public class ChatAnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void normalCase_multipleUsersAndMessages() throws Exception {
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("user1", "hello", 1000),
                createMessage("user1", "world!", 1001),
                createMessage("user2", "test", 1002)
        );

        String response = mockMvc.perform(post("/api/chat/analyze")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(messages)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> result = objectMapper.readValue(response, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
        assertEquals(2, perUser.size());

        @SuppressWarnings("unchecked")
        Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
        assertEquals(2, user1.get("count"));
        assertEquals(5, user1.get("averageLength"));          // 11 / 2 = 5 (integer division)
        assertEquals("world!", ((Map<String, Object>) user1.get("longestMessage")).get("content"));

        @SuppressWarnings("unchecked")
        Map<String, Object> user2 = (Map<String, Object>) perUser.get("user2");
        assertEquals(1, user2.get("count"));
        assertEquals(4, user2.get("averageLength"));
        assertEquals("test", ((Map<String, Object>) user2.get("longestMessage")).get("content"));
    }

    @Test
    void emptyList_shouldReturnEmptyPerUser() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = new ArrayList<>();

        try {
            Map<String, Object> result = controller.analyze(messages);

            @SuppressWarnings("unchecked")
            Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
            assertTrue(perUser.isEmpty());
        } catch (Exception e) {
            fail("Should not throw exception");
        }
    }

    @Test
    void nullInput_shouldReturnEmptyResultGracefully() {
        ChatAnalyticsController controller = new ChatAnalyticsController();

        try {
            Map<String, Object> result = controller.analyze(null);

            assertNotNull(result);
            @SuppressWarnings("unchecked")
            Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
            assertTrue(perUser.isEmpty());
        } catch (Exception e) {
            fail("Should not throw exception");
        }
    }

    @Test
    void skipsInvalidMessages_nullUserId_emptyUserId_nullContent() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage(null, "content", 1000),     // null userId
                createMessage("", "content", 1001),       // empty userId
                createMessage("user1", null, 1002),       // null content
                createMessage("user1", "valid", 1003)
        );

        try {
            Map<String, Object> result = controller.analyze(messages);

            @SuppressWarnings("unchecked")
            Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
            assertEquals(1, perUser.size());

            @SuppressWarnings("unchecked")
            Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
            assertEquals(1, user1.get("count"));
            assertEquals(5, user1.get("averageLength"));
            assertEquals("valid", ((ChatAnalyticsController.Message) user1.get("longestMessage")).getContent());
        } catch (Exception e) {
            fail("Should not throw exception");
        }
    }

    @Test
    void skipsNullElementsInList() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = new ArrayList<>();
        messages.add(createMessage("user1", "good", 1000));
        messages.add(null);
        messages.add(createMessage("user2", "okay", 1001));

        try {
            Map<String, Object> result = controller.analyze(messages);

            @SuppressWarnings("unchecked")
            Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
            assertEquals(2, perUser.size());
            assertTrue(perUser.containsKey("user1"));
            assertTrue(perUser.containsKey("user2"));
        } catch (Exception e) {
            fail("Should not throw exception");
        }
    }

    @Test
    void singleMessage() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = List.of(
                createMessage("user1", "hello", 1000)
        );

        try {
            Map<String, Object> result = controller.analyze(messages);

            @SuppressWarnings("unchecked")
            Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
            assertEquals(1, perUser.size());

            @SuppressWarnings("unchecked")
            Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
            assertEquals(1, user1.get("count"));
            assertEquals(5, user1.get("averageLength"));
            assertEquals("hello", ((ChatAnalyticsController.Message) user1.get("longestMessage")).getContent());
        } catch (Exception e) {
            fail("Should not throw exception");
        }
    }

    @Test
    void emptyContentIsAllowed_lengthZero() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = List.of(
                createMessage("user1", "", 1000)
        );

        try {
            Map<String, Object> result = controller.analyze(messages);

            @SuppressWarnings("unchecked")
            Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
            assertEquals(1, perUser.size());

            @SuppressWarnings("unchecked")
            Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");
            assertEquals(1, user1.get("count"));
            assertEquals(0, user1.get("averageLength"));
            assertEquals("", ((ChatAnalyticsController.Message) user1.get("longestMessage")).getContent());
        } catch (Exception e) {
            fail("Should not throw exception");
        }
    }

    @Test
    void longestMessageOnEqualLength_isDeterministic() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = List.of(
                createMessage("user1", "test", 1000),
                createMessage("user1", "best", 1001)    // same length
        );

        try {
            Map<String, Object> result = controller.analyze(messages);

            @SuppressWarnings("unchecked")
            Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
            @SuppressWarnings("unchecked")
            Map<String, Object> user1 = (Map<String, Object>) perUser.get("user1");

            assertEquals(2, user1.get("count"));
            assertEquals(4, user1.get("averageLength"));
            assertEquals("test", ((ChatAnalyticsController.Message) user1.get("longestMessage")).getContent());
        } catch (Exception e) {
            fail("Should not throw exception");
        }
    }

    @Test
    void largePayload_shouldCompleteQuickly() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            messages.add(createMessage("user" + (i % 10), "msg " + i, 1000 + i));
        }

        try {
            long start = System.nanoTime();
            Map<String, Object> result = controller.analyze(messages);
            long durationMs = (System.nanoTime() - start) / 1_000_000;

            assertTrue(durationMs < 500, "Took too long: " + durationMs + " ms");

            @SuppressWarnings("unchecked")
            Map<String, Object> perUser = (Map<String, Object>) result.get("perUser");
            assertEquals(10, perUser.size());
        } catch (Exception e) {
            fail("Should not throw exception");
        }
    }

    @Test
    void cacheSize_shouldMatchInputSize() {
        ChatAnalyticsController controller = new ChatAnalyticsController();
        List<ChatAnalyticsController.Message> messages = Arrays.asList(
                createMessage("a", "x", 1),
                createMessage("b", "yy", 2),
                null
        );

        try {
            Map<String, Object> result = controller.analyze(messages);
            assertEquals(3, result.get("cacheSize"));
        } catch (Exception e) {
            fail("Should not throw exception");
        }
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