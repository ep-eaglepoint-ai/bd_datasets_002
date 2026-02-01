package com.example.sessions;

import org.junit.jupiter.api.Test;
import org.springframework.validation.BindException;

import static org.junit.jupiter.api.Assertions.*;

public class ApiExceptionHandlerTest {

    @Test
    void bindExceptionProducesApiError() {
        Session bad = new Session(2000L, 1000L);
        BindException ex = new BindException(bad, "session");
        ex.rejectValue("endTime", "invalid", "must be greater than or equal to startTime");
        ApiExceptionHandler handler = new ApiExceptionHandler();
        ApiError err = handler.handleBindException(ex);
        assertEquals("error", err.getStatus());
        assertNotNull(err.getErrors());
        assertTrue(err.getErrors().contains("endTime must be greater than or equal to startTime"));
    }
}
