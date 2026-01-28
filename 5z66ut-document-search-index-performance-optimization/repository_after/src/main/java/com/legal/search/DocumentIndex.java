package com.legal.search;

import java.util.*;
import java.util.regex.*;
import java.util.concurrent.locks.*;
import java.util.stream.Collectors;

public class DocumentIndex {

    private final Map<String, Document> documentsById;
    private final Map<String, Map<String, Integer>> termFrequencies; // term -> {docId -> count}
    private final Map<String, Set<String>> termIndex; // term -> {set of docIds}
    private final ReadWriteLock lock = new ReentrantReadWriteLock();

    public DocumentIndex() {
        this.documentsById = new HashMap<>();
        this.termFrequencies = new HashMap<>();
        this.termIndex = new HashMap<>();
    }

    public void indexDocument(Document doc) {
        lock.writeLock().lock();
        try {
            documentsById.put(doc.getId(), doc);
            String content = doc.getContent();
            String[] terms = extractTerms(content);
            Map<String, Integer> docTermFreqs = new HashMap<>();
            for (String term : terms) {
                String normalized = term.toLowerCase().trim();
                if (normalized.length() < 2)
                    continue;
                docTermFreqs.merge(normalized, 1, Integer::sum);
                termIndex.computeIfAbsent(normalized, k -> new HashSet<>()).add(doc.getId());
            }
            for (Map.Entry<String, Integer> entry : docTermFreqs.entrySet()) {
                termFrequencies.computeIfAbsent(entry.getKey(), k -> new HashMap<>())
                        .put(doc.getId(), entry.getValue());
            }
        } finally {
            lock.writeLock().unlock();
        }
    }

    public void indexDocuments(List<Document> docs) {
        for (Document doc : docs) {
            indexDocument(doc);
        }
    }

    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^a-zA-Z0-9]+");

    private String[] extractTerms(String content) {
        if (content == null)
            return new String[0];
        return NON_ALPHANUMERIC.split(content);
    }

    public List<SearchResult> search(String query) {
        lock.readLock().lock();
        try {
            if (query == null || query.trim().isEmpty())
                return new ArrayList<>();
            String[] queryTokens = extractTerms(query);
            List<String> queryTerms = new ArrayList<>();
            for (String term : queryTokens) {
                String normalized = term.toLowerCase().trim();
                if (normalized.length() >= 2)
                    queryTerms.add(normalized);
            }
            if (queryTerms.isEmpty())
                return new ArrayList<>();

            Set<String> matchingDocs = findMatchingDocuments(queryTerms);
            List<SearchResult> results = new ArrayList<>();
            for (String docId : matchingDocs) {
                Document doc = documentsById.get(docId);
                double score = calculateScore(docId, queryTerms);
                String snippet = generateSnippet(doc.getContent(), queryTerms);
                results.add(new SearchResult(docId, doc.getTitle(), score, snippet));
            }
            Collections.sort(results);
            return results;
        } finally {
            lock.readLock().unlock();
        }
    }

    private Set<String> findMatchingDocuments(List<String> terms) {
        Set<String> result = null;
        for (String term : terms) {
            Set<String> postings = termIndex.get(term);
            if (postings == null || postings.isEmpty())
                return new HashSet<>();
            if (result == null) {
                result = new HashSet<>(postings);
            } else {
                result.retainAll(postings);
            }
            if (result.isEmpty())
                break;
        }
        return result != null ? result : new HashSet<>();
    }

    private double calculateScore(String docId, List<String> queryTerms) {
        double score = 0.0;
        int totalDocs = documentsById.size();
        for (String queryTerm : queryTerms) {
            Map<String, Integer> docFreqs = termFrequencies.get(queryTerm);
            if (docFreqs == null)
                continue;
            Integer tfCount = docFreqs.get(docId);
            if (tfCount != null && tfCount > 0) {
                int documentFrequency = termIndex.get(queryTerm).size();
                double tf = 1 + Math.log(tfCount);
                double idf = Math.log((double) totalDocs / (1 + documentFrequency));
                score += tf * idf;
            }
        }
        return score;
    }

    private String generateSnippet(String content, List<String> queryTerms) {
        if (content == null || content.isEmpty())
            return "";
        String contentLower = content.toLowerCase();
        int snippetStart = -1;
        String foundTerm = null;
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
        StringBuilder sb = new StringBuilder();
        if (start > 0)
            sb.append("...");
        sb.append(content, start, end);
        if (end < content.length())
            sb.append("...");
        return sb.toString();
    }

    public int getDocumentCount() {
        lock.readLock().lock();
        try {
            return documentsById.size();
        } finally {
            lock.readLock().unlock();
        }
    }

    public int getTermCount() {
        lock.readLock().lock();
        try {
            return termIndex.size();
        } finally {
            lock.readLock().unlock();
        }
    }

    public void clear() {
        lock.writeLock().lock();
        try {
            documentsById.clear();
            termIndex.clear();
            termFrequencies.clear();
        } finally {
            lock.writeLock().unlock();
        }
    }

    public boolean containsDocument(String docId) {
        lock.readLock().lock();
        try {
            return documentsById.containsKey(docId);
        } finally {
            lock.readLock().unlock();
        }
    }

    public Document getDocument(String docId) {
        lock.readLock().lock();
        try {
            return documentsById.get(docId);
        } finally {
            lock.readLock().unlock();
        }
    }

    public boolean removeDocument(String docId) {
        lock.writeLock().lock();
        try {
            Document removed = documentsById.remove(docId);
            if (removed == null)
                return false;

            // Incremental cleanup instead of rebuild
            String[] terms = extractTerms(removed.getContent());
            for (String term : terms) {
                String normalized = term.toLowerCase().trim();
                if (normalized.length() < 2)
                    continue;

                Set<String> postings = termIndex.get(normalized);
                if (postings != null) {
                    postings.remove(docId);
                    if (postings.isEmpty())
                        termIndex.remove(normalized);
                }

                Map<String, Integer> freqs = termFrequencies.get(normalized);
                if (freqs != null) {
                    freqs.remove(docId);
                    if (freqs.isEmpty()) {
                        termFrequencies.remove(normalized);
                    }
                }
            }
            return true;
        } finally {
            lock.writeLock().unlock();
        }
    }

    private void rebuildTermIndex() {
        // Method preserved for API compatibility if needed internally,
        // though logic is now incremental in index/remove.
        lock.writeLock().lock();
        try {
            termIndex.clear();
            termFrequencies.clear();
            for (Document doc : documentsById.values()) {
                String[] terms = extractTerms(doc.getContent());
                Map<String, Integer> docTermFreqs = new HashMap<>();
                for (String term : terms) {
                    String normalized = term.toLowerCase().trim();
                    if (normalized.length() < 2)
                        continue;
                    docTermFreqs.merge(normalized, 1, Integer::sum);
                    termIndex.computeIfAbsent(normalized, k -> new HashSet<>()).add(doc.getId());
                }
                for (Map.Entry<String, Integer> entry : docTermFreqs.entrySet()) {
                    termFrequencies.computeIfAbsent(entry.getKey(), k -> new HashMap<>())
                            .put(doc.getId(), entry.getValue());
                }
            }
        } finally {
            lock.writeLock().unlock();
        }
    }

    public Map<String, Object> getStatistics() {
        lock.readLock().lock();
        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("documentCount", documentsById.size());
            stats.put("termCount", termIndex.size());
            long totalPostings = 0;
            for (Set<String> postings : termIndex.values()) {
                totalPostings += postings.size();
            }
            stats.put("totalPostings", totalPostings);
            long totalContentBytes = 0;
            for (Document doc : documentsById.values()) {
                totalContentBytes += doc.getContent().length() * 2L;
            }
            stats.put("totalContentBytes", totalContentBytes);
            return stats;
        } finally {
            lock.readLock().unlock();
        }
    }
}
