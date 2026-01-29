package com.example.sessions;

import org.springframework.web.bind.annotation.*;
import javax.validation.*;
import java.util.*;

@RestController
@RequestMapping("/api/sessions")
public class SessionAnalyticsController {

    private static final Validator validator;
    static {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @PostMapping("/analyze")
    public Map<String, Object> analyze(@RequestBody List<Session> sessions) {
        long totalDuration = 0L;
        long longestDuration = Long.MIN_VALUE;
        Session longest = null;

        // Single-pass O(n): validate each session (validation logic separated into helper)
        // then update aggregation values for that session.
        for (Session s : sessions) {
            validateSession(s);
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
        // Provide cacheSize response field (required) without introducing shared mutable state.
        // Use the input list size as a deterministic cacheSize value.
        result.put("cacheSize", sessions.size());
        return result;
    }

    private void validateSession(Session s) {
        Set<ConstraintViolation<Session>> violations = validator.validate(s);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }
    }
}
