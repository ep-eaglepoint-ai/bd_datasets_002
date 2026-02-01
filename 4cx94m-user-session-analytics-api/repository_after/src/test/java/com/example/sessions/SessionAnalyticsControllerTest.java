package com.example.sessions;

import org.junit.jupiter.api.Test;
import java.lang.reflect.Field;
import java.util.*;
import javax.validation.Validation;
import javax.validation.Validator;
import javax.validation.ValidatorFactory;
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
        Session bad = new Session(2000L, 1000L);
        ValidatorFactory vf = Validation.buildDefaultValidatorFactory();
        Validator validator = vf.getValidator();
        Set<javax.validation.ConstraintViolation<Session>> violations = validator.validate(bad);
        assertFalse(violations.isEmpty());
    }

    @Test
    void controllerIsStateless() {
        Field[] fields = SessionAnalyticsController.class.getDeclaredFields();
        for (Field f : fields) {
            boolean isStatic = java.lang.reflect.Modifier.isStatic(f.getModifiers());
            boolean isFinal = java.lang.reflect.Modifier.isFinal(f.getModifiers());
            if (!isStatic) {
                if (!isFinal) {
                    fail("Controller contains mutable instance field: " + f.getName());
                }
            } else {
                if (!isFinal) {
                    fail("Controller contains mutable static field: " + f.getName());
                }
            }
        }
    }
}
