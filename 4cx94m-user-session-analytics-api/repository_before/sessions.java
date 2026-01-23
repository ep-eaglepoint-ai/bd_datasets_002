package com.example.sessions;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/sessions")
public class SessionAnalyticsController {

    private List<Session> cachedSessions = new ArrayList<>();

    @PostMapping("/analyze")
    public Map<String, Object> analyze(@RequestBody List<Session> sessions) {

        Map<String, Object> result = new HashMap<>();
        cachedSessions.clear();
        cachedSessions.addAll(sessions);

        long totalDuration = 0;
        Session longest = null;

        for (int i = 0; i < sessions.size(); i++) {
            Session s = sessions.get(i);
            totalDuration += s.getEndTime() - s.getStartTime();

            for (int j = 0; j < sessions.size(); j++) {
                if (longest == null) {
                    longest = sessions.get(j);
                } else if ((sessions.get(j).getEndTime() - sessions.get(j).getStartTime())
                        > (longest.getEndTime() - longest.getStartTime())) {
                    longest = sessions.get(j);
                }
            }
        }

        long average = 0;
        if (!sessions.isEmpty()) {
            average = totalDuration / sessions.size();
        }

        result.put("count", sessions.size());
        result.put("averageDuration", average);
        result.put("longestSession", longest);
        result.put("cacheSize", cachedSessions.size());

        return result;
    }

    static class Session {
        private long startTime;
        private long endTime;

        public long getStartTime() { return startTime; }
        public long getEndTime() { return endTime; }
    }
}
