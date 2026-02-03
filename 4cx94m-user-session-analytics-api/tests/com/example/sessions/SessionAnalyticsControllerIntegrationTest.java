package com.example.sessions;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.*;
import java.util.Set;

public class SessionAnalyticsControllerIntegrationTest {

    @Test
    void postInvalidSessionReturns400() throws Exception {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        Session bad = new Session(2000L, 1000L);
        Set<javax.validation.ConstraintViolation<Session>> violations = validator.getValidator().validate(bad);
        assertFalse(violations.isEmpty());
    }

    @Test
    void emptyListProducesZeroAverageAndNullLongest() throws Exception {
        SessionAnalyticsController ctrl = new SessionAnalyticsController();

        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        MockMvc mvc = MockMvcBuilders.standaloneSetup(ctrl)
            .setValidator(validator)
            .build();

        String body = "[]";

        mvc.perform(post("/api/sessions/analyze").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.averageDuration").value(0))
            .andExpect(jsonPath("$.longestSession").value(nullValue()));
    }
}
