package com.eaglepoint.chat;

import org.springframework.context.annotation.Configuration;

/**
 * Test configuration class for Spring Boot test context.
 * This allows @WebMvcTest to find a @SpringBootConfiguration.
 * Note: This is only for testing. The actual application should have
 * @SpringBootApplication on the main application class (ChatAnalyticsApplication).
 */
@Configuration
public class TestConfig {
}
