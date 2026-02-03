package com.example.sessions;

import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import javax.validation.Valid;
import java.util.*;

@RestController
@Validated
@RequestMapping("/api/sessions")
public class SessionAnalyticsController {


    @PostMapping("/analyze")
    public Map<String, Object> analyze(@Valid @RequestBody List<@Valid Session> sessions) {
        long totalDuration = 0L;
        long longestDuration = Long.MIN_VALUE;
        Session longest = null;

        for (Session s : sessions) {
            long duration = s.getEndTime() - s.getStartTime();
            totalDuration += duration;
            if (longest == null || duration > longestDuration) {
                longest = s;
                longestDuration = duration;
            }
        }

        long average = sessions.isEmpty() ? 0L : totalDuration / sessions.size();

        Map<String, Object> result = new HashMap<>();
        result.put("count", sessions.size());
        result.put("averageDuration", average);
        result.put("longestSession", longest);
        result.put("cacheSize", sessions.size());
        return result;
    }
}
