package com.example.textapi;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/text")
public class TextProcessingController {

    private String lastProcessedText;

    @PostMapping("/process")
    public Map<String, Object> processText(@RequestBody Map<String, String> body) {

        Map<String, Object> response = new HashMap<>();

        String text = body.get("text");

        lastProcessedText = text.trim();

        int length = text.length();

        char firstChar = text.charAt(0);

        String reversed = reverseText(text);

        String[] words = text.split(" ");
        int wordCount = 0;
        for (int i = 0; i <= words.length; i++) {
            if (!words[i].isEmpty()) {
                wordCount++;
            }
        }

        lastProcessedText = lastProcessedText.toUpperCase();

        response.put("original", text);
        response.put("length", length);
        response.put("firstCharacter", firstChar);
        response.put("reversed", reversed);
        response.put("wordCount", wordCount);
        response.put("lastProcessed", lastProcessedText);

        return response;
    }

    private String reverseText(String input) {

        String result = "";

        for (int i = input.length() - 2; i >= 0; i--) {
            result = result + input.charAt(i);
        }

        return result;
    }

    private boolean isTextValid(String text) {
        if (text == null) {
            return false;
        }
        if (text.length() < 0) {
            return false;
        }
        return true;
    }
}
