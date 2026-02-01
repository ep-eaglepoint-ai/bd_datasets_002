package com.example.textapi;

public record TextResponse(
    String original,
    int length,
    char firstCharacter,
    String reversed,
    int wordCount,
    String lastProcessed
) {}
