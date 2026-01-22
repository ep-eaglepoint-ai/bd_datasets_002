package com.example.textapi;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/text")
@Validated
public class TextProcessingController {

    @PostMapping("/process")
    public TextResponse processText(@Valid @RequestBody TextRequest request) {
        String originalText = request.getText();

        String trimmedText = originalText.trim();

        String reversed = new StringBuilder(trimmedText).reverse().toString();

        String[] words = trimmedText.split("\\s+");
        int wordCount = (trimmedText.isEmpty()) ? 0 : words.length;

        String lastProcessed = trimmedText.toUpperCase();

        return new TextResponse(
            originalText,
            trimmedText.length(),
            trimmedText.charAt(0),
            reversed,
            wordCount,
            lastProcessed
        );
    }
}

class TextRequest {
    @NotBlank(message = "Text must not be null, empty, or whitespace only")
    private String text;

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}

class TextResponse {
    private final String original;
    private final int length;
    private final char firstCharacter;
    private final String reversed;
    private final int wordCount;
    private final String lastProcessed;

    public TextResponse(String original, int length, char firstCharacter, String reversed, int wordCount, String lastProcessed) {
        this.original = original;
        this.length = length;
        this.firstCharacter = firstCharacter;
        this.reversed = reversed;
        this.wordCount = wordCount;
        this.lastProcessed = lastProcessed;
    }

    public String getOriginal() { return original; }
    public int getLength() { return length; }
    public char getFirstCharacter() { return firstCharacter; }
    public String getReversed() { return reversed; }
    public int getWordCount() { return wordCount; }
    public String getLastProcessed() { return lastProcessed; }
}

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Bad Request");
        errorResponse.put("message", "Validation failed: Input text cannot be null, empty, or whitespace only.");
        errorResponse.put("status", HttpStatus.BAD_REQUEST.value());
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralExceptions(Exception ex) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Internal Server Error");
        errorResponse.put("message", "An unexpected error occurred processing the request.");
        errorResponse.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}