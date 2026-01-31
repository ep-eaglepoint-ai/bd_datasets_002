package com.example.textapi;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/text")
@Validated
public class TextProcessingController {

    private static final String WHITESPACE_REGEX = "\\s+";

    @PostMapping("/process")
    public TextResponse processText(@Valid @RequestBody TextRequest request) {
        String originalText = request.text();
        String trimmedText = originalText.trim();

        return new TextResponse(
            originalText,
            trimmedText.length(),
            trimmedText.charAt(0),
            reverseText(trimmedText),
            countWords(trimmedText),
            trimmedText.toUpperCase()
        );
    }

    private String reverseText(String text) {
        return new StringBuilder(text).reverse().toString();
    }

    private int countWords(String text) {
        return text.isEmpty() ? 0 : text.split(WHITESPACE_REGEX).length;
    }
}