package com.example.sessions;

import org.junit.jupiter.api.Test;
import javax.validation.ConstraintViolationException;
import java.lang.reflect.Field;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

public class SessionAnalyticsControllerTest {

    @Test
    void durationCalculatedAsEndMinusStart() {
        SessionAnalyticsController ctrl = new SessionAnalyticsController();
        List<Session> sessions = Arrays.asList(new Session(1000L, 2000L), new Session(2000L, 3000L));
        Map<String, Object> res = ctrl.analyze(sessions);
        assertEquals(2, res.get("count"));
        assertEquals(1000L, ((Number) res.get("averageDuration")).longValue());
        assertNotNull(res.get("longestSession"));
    }

    @Test
    void rejectsSessionsWhereEndBeforeStart() {
        SessionAnalyticsController ctrl = new SessionAnalyticsController();
        List<Session> sessions = Collections.singletonList(new Session(2000L, 1000L));
        assertThrows(ConstraintViolationException.class, () -> ctrl.analyze(sessions));
    }

    @Test
    void controllerIsStateless() {
        Field[] fields = SessionAnalyticsController.class.getDeclaredFields();
        for (Field f : fields) {
            if (!java.lang.reflect.Modifier.isStatic(f.getModifiers())) {
                if (!java.lang.reflect.Modifier.isFinal(f.getModifiers())) {
                    fail("Controller contains mutable instance field: " + f.getName());
                }
            }
        }
    }
}
