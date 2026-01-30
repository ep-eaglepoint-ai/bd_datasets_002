package com.example.textapi;

public record ErrorResponse(
    String error,
    String message,
    int status
) {}
