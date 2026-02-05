package com.legal.search;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class SearchOptimizationTest {

    public static void main(String[] args) {
        System.out.println("=== Document Search Optimization Test Suite ===");

        int passed = 0;
        int total = 3;

        try {
            if (runTest("testFunctionalCorrectness", SearchOptimizationTest::testFunctionalCorrectness))
                passed++;
            if (runTest("testPerformanceAndMemory", SearchOptimizationTest::testPerformanceAndMemory))
                passed++;
            if (runTest("testConcurrency", SearchOptimizationTest::testConcurrency))
                passed++;

            System.out.println(
                    "\n[SUMMARY] " + passed + " passed, " + (total - passed) + " failed (total: " + total + ")");
            if (passed < total)
                System.exit(1);
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static boolean runTest(String name, TestMethod method) {
        String nodeId = "com.legal.search.SearchOptimizationTest::" + name;
        try {
            method.run();
            System.out.println(nodeId + " PASSED");
            return true;
        } catch (Throwable t) {
            System.out.println(nodeId + " FAILED");
            t.printStackTrace(System.out);
            return false;
        }
    }

    interface TestMethod {
        void run() throws Exception;
    }

    private static void testFunctionalCorrectness() {
        System.out.println("\n--- Testing Functional Correctness ---");
        DocumentIndex index = new DocumentIndex();

        Document doc1 = new Document("1", "Legal Case A", "The contract was signed in Chicago. Chicago is a city.");
        Document doc2 = new Document("2", "Legal Case B", "The contract was signed in New York. New York is big.");
        Document doc3 = new Document("3", "Misc", "Chicago and New York are both cities.");

        Document doc4 = new Document("4", "Other", "Just some random text.");

        index.indexDocument(doc1);
        index.indexDocument(doc2);
        index.indexDocument(doc3);
        index.indexDocument(doc4);

        // Test AND search
        List<SearchResult> results = index.search("Chicago contract");
        assert results.size() == 1 : "Expected 1 result for 'Chicago contract', got " + results.size();
        assert results.get(0).getDocumentId().equals("1") : "Wrong doc returned";

        // Test Ranking (doc1 has 'Chicago' twice, doc3 has it once)
        results = index.search("Chicago");
        assert results.size() == 2 : "Expected 2 results for 'Chicago'";
        assert results.get(0).getDocumentId().equals("1") : "Doc 1 should be ranked higher than Doc 3";
        assert results.get(0).getScore() > results.get(1).getScore() : "Score for Doc 1 should be higher";

        // Test Snippet
        assert results.get(0).getSnippet().contains("Chicago") : "Snippet missing query term";

        // Test Removal
        index.removeDocument("1");
        results = index.search("Chicago");
        assert results.size() == 1 : "Expected 1 result after removal";
        assert results.get(0).getDocumentId().equals("3") : "Wrong doc after removal";

        System.out.println("✅ Functional correctness verified.");
    }

    private static void testPerformanceAndMemory() {
        System.out.println("\n--- Testing Performance and Memory (100k Docs) ---");
        DocumentIndex index = new DocumentIndex();
        int docCount = 100000;

        Runtime runtime = Runtime.getRuntime();
        runtime.gc();
        long initialMemory = runtime.totalMemory() - runtime.freeMemory();

        System.out.println("Indexing " + docCount + " documents...");
        long startTime = System.currentTimeMillis();
        for (int i = 0; i < docCount; i++) {
            index.indexDocument(new Document(
                    "doc_" + i,
                    "Title " + i,
                    "This is a legal document about contract " + i
                            + " and some common terms Chicago New York law firm."));
        }
        long indexingTime = System.currentTimeMillis() - startTime;
        System.out.println("Indexing completed in: " + indexingTime + "ms");
        assert indexingTime < 5000 : "Indexing took too long: " + indexingTime + "ms";

        runtime.gc();
        long finalMemory = runtime.totalMemory() - runtime.freeMemory();
        double memoryMB = (finalMemory - initialMemory) / (1024.0 * 1024.0);
        System.out.println("Estimated memory usage: " + String.format("%.2f", memoryMB) + " MB");
        assert memoryMB < 2000 : "Memory usage too high: " + memoryMB + "MB";

        System.out.println("Running 100 search queries...");
        startTime = System.currentTimeMillis();
        for (int i = 0; i < 100; i++) {
            List<SearchResult> res = index.search("Chicago Law " + (i * 1000));
        }
        long searchTime = (System.currentTimeMillis() - startTime) / 100;
        System.out.println("Average search latency: " + searchTime + "ms");
        assert searchTime < 50 : "Search latency too high: " + searchTime + "ms";

        System.out.println("✅ Performance and memory targets met.");
    }

    private static void testConcurrency() throws Exception {
        System.out.println("\n--- Testing Concurrency ---");
        DocumentIndex index = new DocumentIndex();
        int numSearchThreads = 100;
        int searchesPerThread = 100; // 10,000 total searches (Criterion 12)
        ExecutorService executor = Executors.newFixedThreadPool(numSearchThreads + 5);

        // Pre-fill
        for (int i = 0; i < 500; i++) {
            index.indexDocument(new Document("init_" + i, "Legal", "contract breach standard clause"));
        }

        CountDownLatch latch = new CountDownLatch(numSearchThreads);
        String[] terms = { "contract", "breach", "legal", "standard", "clause" };
        Random rand = new Random();

        for (int i = 0; i < numSearchThreads; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < searchesPerThread; j++) {
                        index.search(terms[rand.nextInt(terms.length)]);
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        // Concurrent writers
        for (int i = 0; i < 5; i++) {
            final int wid = i;
            executor.submit(() -> {
                for (int j = 0; j < 100; j++) {
                    index.indexDocument(new Document("w" + wid + "_" + j, "Title", "content"));
                    if (j % 10 == 0)
                        index.removeDocument("w" + wid + "_" + (j - 10));
                }
            });
        }

        latch.await();
        executor.shutdown();
        executor.awaitTermination(30, TimeUnit.SECONDS);
        System.out.println("✅ Concurrency verification successful.");
    }
}
