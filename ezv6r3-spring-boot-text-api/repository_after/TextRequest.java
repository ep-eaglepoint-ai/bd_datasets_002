package com.example.textapi;

import jakarta.validation.constraints.NotBlank;

public record TextRequest(
    @NotBlank(message = "Text must not be null, empty, or whitespace only")
    String text
) {}
