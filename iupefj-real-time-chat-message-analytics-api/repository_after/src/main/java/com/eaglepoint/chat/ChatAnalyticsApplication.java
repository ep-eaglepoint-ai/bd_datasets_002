package com.eaglepoint.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main Spring Boot application class.
 * This is the proper location for @SpringBootApplication annotation.
 * The ChatAnalyticsController should only have @RestController and @RequestMapping.
 */
@SpringBootApplication
public class ChatAnalyticsApplication {
    public static void main(String[] args) {
        SpringApplication.run(ChatAnalyticsApplication.class, args);
    }
}
