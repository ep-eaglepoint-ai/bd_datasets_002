package com.eaglepoint.chat;

import org.springframework.web.bind.annotation.*;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@SpringBootApplication
public class ChatAnalyticsController {

    @PostMapping("/analyze")
    public Map<String, Object> analyze(@RequestBody List<Message> messages) {
        if (messages == null) {
            Map<String, Object> result = new HashMap<>();
            result.put("perUser", new HashMap<>());
            result.put("cacheSize", 0);
            return result;
        }
        // Filter valid messages: userId and content not null
        List<Message> validMessages = messages.stream()
                .filter(msg -> msg != null && msg.getUserId() != null && !msg.getUserId().trim().isEmpty() && msg.getContent() != null)
                .collect(Collectors.toList());

        // Group by user
        Map<String, List<Message>> userMessages = validMessages.stream()
                .collect(Collectors.groupingBy(Message::getUserId));

        Map<String, Object> perUserStats = new HashMap<>();
        for (Map.Entry<String, List<Message>> entry : userMessages.entrySet()) {
            String user = entry.getKey();
            List<Message> msgs = entry.getValue();

            int count = msgs.size();
            int totalLength = msgs.stream().mapToInt(msg -> msg.getContent().length()).sum();
            int averageLength = totalLength / count;

            // Find longest message: max length, if tie, smallest timestamp
            Message longest = msgs.stream()
                    .max(Comparator.comparingInt((Message m) -> m.getContent().length())
                            .thenComparing(Comparator.comparingLong(Message::getTimestamp).reversed()))
                    .orElse(null);

            Map<String, Object> stats = new HashMap<>();
            stats.put("count", count);
            stats.put("averageLength", averageLength);
            stats.put("longestMessage", longest);
            perUserStats.put(user, stats);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("perUser", perUserStats);
        result.put("cacheSize", messages.size());
        return result;
    }

    public static class Message {
        public String userId;
        public String content;
        public long timestamp;

        public Message() {}

        public Message(String userId, String content, long timestamp) {
            this.userId = userId;
            this.content = content;
            this.timestamp = timestamp;
        }

        public String getUserId() { return userId; }
        public String getContent() { return content; }
        public long getTimestamp() { return timestamp; }
    }
}