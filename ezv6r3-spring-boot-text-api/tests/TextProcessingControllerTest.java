package com.example.textapi;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TextProcessingController.class)
public class TextProcessingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testValidInput() throws Exception {
        // This checks if Logic is correct (Reverse, Word Count)
        // Before code fails this because of the "length - 2" bug and "index <= length" bug
        String json = "{\"text\": \"hello world\"}";

        mockMvc.perform(post("/api/text/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.original").value("hello world"))
                .andExpect(jsonPath("$.reversed").value("dlrow olleh")) // Before code might return 'dlorw olle'
                .andExpect(jsonPath("$.wordCount").value(2));
    }

    @Test
    public void testMultipleSpacesAndTabs() throws Exception {
        // Checks logic for word counting
        // Before code fails because it splits only by " "
        String json = "{\"text\": \"hello   world\\tfrom\\tjava\"}";

        mockMvc.perform(post("/api/text/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.wordCount").value(4));
    }

    @Test
    public void testEmptyInput() throws Exception {
        // Checks Validation
        // Before code returns 200 or 500 (Fail)
        // After code returns 400 (Pass)
        String json = "{\"text\": \"\"}";

        mockMvc.perform(post("/api/text/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest()); // Expect 400
    }

    @Test
    public void testWhitespaceOnlyInput() throws Exception {
        // Checks Validation
        String json = "{\"text\": \"   \"}";

        mockMvc.perform(post("/api/text/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest()); // Expect 400
    }

    @Test
    public void testNullInput() throws Exception {
        // Checks Validation
        String json = "{}";

        mockMvc.perform(post("/api/text/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest()); // Expect 400
    }
}