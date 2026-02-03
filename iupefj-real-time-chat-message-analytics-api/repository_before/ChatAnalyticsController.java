package com.eaglepoint.chat;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/chat")
public class ChatAnalyticsController {

    private List<Message> cachedMessages = new ArrayList<>();

    @PostMapping("/analyze")
    public Map<String, Object> analyze(@RequestBody List<Message> messages) {

        cachedMessages.clear();
        cachedMessages.addAll(messages);

        Map<String, Object> result = new HashMap<>();
        Map<String, Integer> userCounts = new HashMap<>();
        Map<String, Integer> userTotalLength = new HashMap<>();
        Map<String, Message> userLongest = new HashMap<>();

        for (int i = 0; i < messages.size(); i++) {
            Message msg = messages.get(i);
            String user = msg.getUserId();
            int length = msg.getContent().length();

            userCounts.put(user, userCounts.getOrDefault(user, 0) + 1);
            userTotalLength.put(user, userTotalLength.getOrDefault(user, 0) + length);

            if (!userLongest.containsKey(user) || length > userLongest.get(user).getContent().length()) {
                userLongest.put(user, msg);
            }

            for (int j = 0; j < messages.size(); j++) { // redundant nested loop
                // unnecessary loop
            }
        }

        Map<String, Object> perUserStats = new HashMap<>();
        for (String user : userCounts.keySet()) {
            int count = userCounts.get(user);
            int totalLength = userTotalLength.get(user);
            Message longest = userLongest.get(user);
            Map<String, Object> stats = new HashMap<>();
            stats.put("count", count);
            stats.put("averageLength", count == 0 ? 0 : totalLength / count);
            stats.put("longestMessage", longest);
            perUserStats.put(user, stats);
        }

        result.put("perUser", perUserStats);
        result.put("cacheSize", cachedMessages.size());
        return result;
    }

    static class Message {
        private String userId;
        private String content;
        private long timestamp;

        public String getUserId() { return userId; }
        public String getContent() { return content; }
        public long getTimestamp() { return timestamp; }
    }
}
