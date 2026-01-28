package com.legal.search;

public class SearchResult implements Comparable<SearchResult> {
    private String documentId;
    private String title;
    private double score;
    private String snippet;

    public SearchResult(String documentId, String title, double score, String snippet) {
        this.documentId = documentId;
        this.title = title;
        this.score = score;
        this.snippet = snippet;
    }

    public String getDocumentId() { return documentId; }
    public String getTitle() { return title; }
    public double getScore() { return score; }
    public String getSnippet() { return snippet; }

    public int compareTo(SearchResult other) {
        return Double.compare(other.score, this.score);
    }
}

