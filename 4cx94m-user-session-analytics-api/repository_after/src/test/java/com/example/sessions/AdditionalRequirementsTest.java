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

        // Create a tiny ConstraintViolation implementation to include in the exception
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

        Map<String, Object> body = handler.handleConstraintViolation(ex);
        assertEquals("error", body.get("status"));
        assertTrue(body.get("errors") instanceof List);
        List<?> errors = (List<?>) body.get("errors");
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

        // Verify response keys
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
        // locate the source file anywhere under the current working directory
        Path start = Path.of(System.getProperty("user.dir"));
        Optional<Path> found = Files.walk(start)
            .filter(p -> p.getFileName().toString().equals("SessionAnalyticsController.java"))
            .filter(p -> p.toString().contains("repository_after"))
            .findFirst();
        assertTrue(found.isPresent(), "Could not locate SessionAnalyticsController.java under project workspace");
        String src = Files.readString(found.get());
        assertFalse(src.contains("cachedSessions"), "repository_after must not introduce shared mutable cache");
        boolean hasI = src.contains("for (int i = 0; i < sessions.size(); i++)");
        boolean hasJ = src.contains("for (int j = 0; j < sessions.size(); j++)");
        assertFalse(hasI && hasJ, "repository_after must not use nested loops over sessions (O(n^2))");
    }

    @Test
    void controllerIsStatelessAndValidatorIsStaticFinal() throws Exception {
        Class<?> ctrl = Class.forName("com.example.sessions.SessionAnalyticsController");
        for (Field f : ctrl.getDeclaredFields()) {
            if (!Modifier.isStatic(f.getModifiers())) {
                fail("Controller contains mutable instance field: " + f.getName());
            }
        }

        Field validator = ctrl.getDeclaredField("validator");
        int mods = validator.getModifiers();
        assertTrue(Modifier.isStatic(mods), "validator must be static");
        assertTrue(Modifier.isFinal(mods), "validator must be final");
    }
}
