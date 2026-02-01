package com.eaglepoint.chat;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Configuration;

/**
 * Test configuration class for Spring Boot test context.
 * This allows @WebMvcTest to find a @SpringBootConfiguration.
 * Note: This is only for testing. The actual application should have
 * a proper main class with @SpringBootApplication.
 */
@Configuration
@SpringBootApplication
public class TestConfig {
    public static void main(String[] args) {
        // This is a placeholder - actual Spring Boot application
        // should be started from a dedicated main class
    }
}
