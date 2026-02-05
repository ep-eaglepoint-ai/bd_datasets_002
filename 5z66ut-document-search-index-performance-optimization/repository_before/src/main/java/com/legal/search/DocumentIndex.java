package com.legal.search;

import java.util.*;
import java.util.regex.*;

public class DocumentIndex {
    
    private List<Document> documents;
    private Map<String, List<String>> termIndex;
    private Map<String, String> documentContent;
    private Map<String, String> documentTitles;
    
    public DocumentIndex() {
        this.documents = new ArrayList<>();
        this.termIndex = new HashMap<>();
        this.documentContent = new HashMap<>();
        this.documentTitles = new HashMap<>();
    }
    
    public void indexDocument(Document doc) {
        documents.add(doc);
        documentContent.put(doc.getId(), doc.getContent());
        documentTitles.put(doc.getId(), doc.getTitle());
        
        String content = doc.getContent();
        String[] terms = extractTerms(content);
        
        for (String term : terms) {
            String normalizedTerm = term.toLowerCase().trim();
            
            if (normalizedTerm.length() < 2) {
                continue;
            }
            
            if (!termIndex.containsKey(normalizedTerm)) {
                termIndex.put(normalizedTerm, new ArrayList<>());
            }
            
            List<String> postings = termIndex.get(normalizedTerm);
            postings.add(doc.getId());
        }
    }
    
    public void indexDocuments(List<Document> docs) {
        for (Document doc : docs) {
            indexDocument(doc);
        }
    }
    
    private String[] extractTerms(String content) {
        Pattern pattern = Pattern.compile("[^a-zA-Z0-9]+");
        String[] tokens = pattern.split(content);
        
        List<String> termList = new ArrayList<>();
        for (String token : tokens) {
            if (token != null && !token.isEmpty()) {
                termList.add(token);
            }
        }
        
        return termList.toArray(new String[0]);
    }
    
    public List<SearchResult> search(String query) {
        List<SearchResult> results = new ArrayList<>();
        
        if (query == null || query.trim().isEmpty()) {
            return results;
        }
        
        String[] queryTerms = extractTerms(query);
        
        if (queryTerms.length == 0) {
            return results;
        }
        
        List<String> normalizedTerms = new ArrayList<>();
        for (String term : queryTerms) {
            String normalized = term.toLowerCase().trim();
            if (normalized.length() >= 2) {
                normalizedTerms.add(normalized);
            }
        }
        
        if (normalizedTerms.isEmpty()) {
            return results;
        }
        
        Set<String> matchingDocs = findMatchingDocuments(normalizedTerms);
        
        for (String docId : matchingDocs) {
            double score = calculateScore(docId, normalizedTerms);
            String title = documentTitles.get(docId);
            String snippet = generateSnippet(docId, normalizedTerms);
            
            results.add(new SearchResult(docId, title, score, snippet));
        }
        
        Collections.sort(results);
        
        return results;
    }
    
    private Set<String> findMatchingDocuments(List<String> terms) {
        Set<String> result = null;
        
        for (String term : terms) {
            List<String> postings = termIndex.get(term);
            
            if (postings == null || postings.isEmpty()) {
                return new HashSet<>();
            }
            
            Set<String> termDocs = new HashSet<>(postings);
            
            if (result == null) {
                result = termDocs;
            } else {
                result.retainAll(termDocs);
            }
            
            if (result.isEmpty()) {
                return result;
            }
        }
        
        return result != null ? result : new HashSet<>();
    }
    
    private double calculateScore(String docId, List<String> queryTerms) {
        double score = 0.0;
        
        String content = documentContent.get(docId);
        if (content == null) {
            return score;
        }
        
        String[] docTerms = extractTerms(content);
        
        for (String queryTerm : queryTerms) {
            int termFrequency = 0;
            for (String docTerm : docTerms) {
                if (docTerm.toLowerCase().equals(queryTerm)) {
                    termFrequency++;
                }
            }
            
            if (termFrequency > 0) {
                int documentFrequency = 0;
                if (termIndex.containsKey(queryTerm)) {
                    documentFrequency = termIndex.get(queryTerm).size();
                }
                
                double tf = 1 + Math.log(termFrequency);
                double idf = Math.log((double) documents.size() / (1 + documentFrequency));
                
                score += tf * idf;
            }
        }
        
        return score;
    }
    
    private String generateSnippet(String docId, List<String> queryTerms) {
        String content = documentContent.get(docId);
        if (content == null || content.isEmpty()) {
            return "";
        }
        
        int snippetStart = -1;
        String foundTerm = null;
        
        String contentLower = "";
        for (int i = 0; i < content.length(); i++) {
            contentLower = contentLower + Character.toLowerCase(content.charAt(i));
        }
        
        for (String term : queryTerms) {
            int pos = contentLower.indexOf(term);
            if (pos != -1 && (snippetStart == -1 || pos < snippetStart)) {
                snippetStart = pos;
                foundTerm = term;
            }
        }
        
        if (snippetStart == -1) {
            return content.substring(0, Math.min(200, content.length())) + "...";
        }
        
        int start = Math.max(0, snippetStart - 50);
        int end = Math.min(content.length(), snippetStart + foundTerm.length() + 150);
        
        String snippet = "";
        if (start > 0) {
            snippet = snippet + "...";
        }
        snippet = snippet + content.substring(start, end);
        if (end < content.length()) {
            snippet = snippet + "...";
        }
        
        return snippet;
    }
    
    public int getDocumentCount() {
        return documents.size();
    }
    
    public int getTermCount() {
        return termIndex.size();
    }
    
    public void clear() {
        documents.clear();
        termIndex.clear();
        documentContent.clear();
        documentTitles.clear();
    }
    
    public boolean containsDocument(String docId) {
        for (Document doc : documents) {
            if (doc.getId().equals(docId)) {
                return true;
            }
        }
        return false;
    }
    
    public Document getDocument(String docId) {
        for (Document doc : documents) {
            if (doc.getId().equals(docId)) {
                return doc;
            }
        }
        return null;
    }
    
    public boolean removeDocument(String docId) {
        Document toRemove = null;
        
        for (Document doc : documents) {
            if (doc.getId().equals(docId)) {
                toRemove = doc;
                break;
            }
        }
        
        if (toRemove == null) {
            return false;
        }
        
        documents.remove(toRemove);
        documentContent.remove(docId);
        documentTitles.remove(docId);
        
        rebuildTermIndex();
        
        return true;
    }
    
    private void rebuildTermIndex() {
        termIndex.clear();
        
        for (Document doc : documents) {
            String content = doc.getContent();
            String[] terms = extractTerms(content);
            
            for (String term : terms) {
                String normalizedTerm = term.toLowerCase().trim();
                
                if (normalizedTerm.length() < 2) {
                    continue;
                }
                
                if (!termIndex.containsKey(normalizedTerm)) {
                    termIndex.put(normalizedTerm, new ArrayList<>());
                }
                
                termIndex.get(normalizedTerm).add(doc.getId());
            }
        }
    }
    
    public Map<String, Object> getStatistics() {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("documentCount", documents.size());
        stats.put("termCount", termIndex.size());
        
        long totalPostings = 0;
        for (List<String> postings : termIndex.values()) {
            totalPostings += postings.size();
        }
        stats.put("totalPostings", totalPostings);
        
        long totalContentSize = 0;
        for (String content : documentContent.values()) {
            totalContentSize += content.length() * 2;
        }
        stats.put("totalContentBytes", totalContentSize);
        
        return stats;
    }
}

