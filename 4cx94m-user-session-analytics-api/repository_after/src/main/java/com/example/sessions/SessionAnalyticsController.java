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
        // Validate declaratively using Bean Validation (separate from aggregation)
        for (Session s : sessions) {
            Set<ConstraintViolation<Session>> violations = validator.validate(s);
            if (!violations.isEmpty()) {
                throw new ConstraintViolationException(violations);
            }
        }

        long totalDuration = 0L;
        long longestDuration = Long.MIN_VALUE;
        Session longest = null;

        // Single-pass O(n) aggregation
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
        return result;
    }
}
