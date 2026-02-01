package com.example.sessions;

import org.junit.jupiter.api.Test;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.AssertTrue;
import javax.validation.ConstraintViolation;
import javax.validation.ConstraintViolationException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class AdditionalRequirementsTest {

    @Test
    void sessionHasBeanValidationAnnotations() throws Exception {
        Class<?> session = Class.forName("com.example.sessions.Session");
        Field start = session.getDeclaredField("startTime");
        Field end = session.getDeclaredField("endTime");
        assertTrue(start.isAnnotationPresent(NotNull.class), "startTime must be @NotNull");
        assertTrue(end.isAnnotationPresent(NotNull.class), "endTime must be @NotNull");

        Method m = session.getDeclaredMethod("isEndAfterOrEqualStart");
        assertTrue(m.isAnnotationPresent(AssertTrue.class), "Session must declare @AssertTrue validation for end >= start");
    }

    @Test
    void apiExceptionHandlerReturnsStableStructure() {
        ApiExceptionHandler handler = new ApiExceptionHandler();

        class SimpleViolation implements ConstraintViolation<Session> {
            private final String message;
            SimpleViolation(String message) { this.message = message; }
            public String getMessage() { return message; }
            public String getMessageTemplate() { return null; }
            public Session getRootBean() { return null; }
            public Class<Session> getRootBeanClass() { return Session.class; }
            public Object getLeafBean() { return null; }
            public Object[] getExecutableParameters() { return new Object[0]; }
            public Object getExecutableReturnValue() { return null; }
            public javax.validation.Path getPropertyPath() { return new javax.validation.Path() {
                public Iterator<Node> iterator() { return Collections.emptyIterator(); }
            }; }
            public Object getInvalidValue() { return null; }
            public javax.validation.metadata.ConstraintDescriptor<?> getConstraintDescriptor() { return null; }
            public <T> T unwrap(Class<T> type) { return null; }
        }

        ConstraintViolation<Session> v = new SimpleViolation("endTime must be greater than or equal to startTime");

        Set<ConstraintViolation<?>> set = new HashSet<>();
        set.add(v);
        ConstraintViolationException ex = new ConstraintViolationException(set);

        ApiError body = handler.handleConstraintViolation(ex);
        assertEquals("error", body.getStatus());
        assertTrue(body.getErrors() instanceof List);
        List<?> errors = body.getErrors();
        assertFalse(errors.isEmpty());
    }

    @Test
    void controllerHasCorrectRequestMappingAndMethod() throws Exception {
        Class<?> ctrl = Class.forName("com.example.sessions.SessionAnalyticsController");
        assertTrue(ctrl.isAnnotationPresent(org.springframework.web.bind.annotation.RequestMapping.class));
        org.springframework.web.bind.annotation.RequestMapping rm = ctrl.getAnnotation(org.springframework.web.bind.annotation.RequestMapping.class);
        assertArrayEquals(new String[]{"/api/sessions"}, rm.value());

        Method analyze = ctrl.getDeclaredMethod("analyze", List.class);
        assertTrue(analyze.isAnnotationPresent(org.springframework.web.bind.annotation.PostMapping.class));
        org.springframework.web.bind.annotation.PostMapping pm = analyze.getAnnotation(org.springframework.web.bind.annotation.PostMapping.class);
        assertArrayEquals(new String[]{"/analyze"}, pm.value());

        Object ctrlInst = ctrl.getDeclaredConstructor().newInstance();
        List<Session> sessions = Arrays.asList(new Session(0L, 10L));
        @SuppressWarnings("unchecked")
        Map<String,Object> res = (Map<String,Object>) analyze.invoke(ctrlInst, sessions);
        assertTrue(res.containsKey("count"));
        assertTrue(res.containsKey("averageDuration"));
        assertTrue(res.containsKey("longestSession"));
    }

    @Test
    void repositoryAfterContainsNoMutableCacheOrNestedLoops() throws Exception {
        Path start = Path.of(System.getProperty("user.dir"));
        Optional<Path> found = Files.walk(start)
            .filter(p -> p.getFileName().toString().equals("SessionAnalyticsController.java"))
            .filter(p -> p.toString().contains("repository_after"))
            .findFirst();
        assertTrue(found.isPresent(), "Could not locate SessionAnalyticsController.java under project workspace");
        String src = Files.readString(found.get());
        assertFalse(src.contains("cachedSessions"), "repository_after must not introduce shared mutable cache");
        int forCount = 0;
        int idx = 0;
        while ((idx = src.indexOf("for (", idx)) >= 0) { forCount++; idx += 4; }
        assertEquals(1, forCount, "repository_after must perform aggregation in exactly one pass (single for-loop)");
    }

    @Test
    void controllerIsStatelessAndValidatorIsStaticFinal() throws Exception {
        Class<?> ctrl = Class.forName("com.example.sessions.SessionAnalyticsController");
        Field[] fields = ctrl.getDeclaredFields();
        assertEquals(0, fields.length, "Controller must not declare fields");
        try {
            ctrl.getDeclaredField("validator");
            fail("Controller must not declare a 'validator' field");
        } catch (NoSuchFieldException e) {
        }
    }
}
