package com.legal.search;

public class Document {
    private String id;
    private String title;
    private String content;
    private long timestamp;

    public Document(String id, String title, String content) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.timestamp = System.currentTimeMillis();
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public long getTimestamp() { return timestamp; }
}

