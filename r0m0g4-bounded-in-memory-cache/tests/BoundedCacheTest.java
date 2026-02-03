package com.example.cache;

public class BoundedCacheTest {

    public static void main(String[] args) throws Exception {
        int passed = 0;
        int failed = 0;

        try {
            testCapacityNeverExceeded();
            passed++;
        } catch (AssertionError e) {
            failed++;
            System.out.println("FAILED: testCapacityNeverExceeded - " + e.getMessage());
        }

        try {
            testLRUEviction();
            passed++;
        } catch (AssertionError e) {
            failed++;
            System.out.println("FAILED: testLRUEviction - " + e.getMessage());
        }

        try {
            testExpiredEntriesNotReturned();
            passed++;
        } catch (AssertionError e) {
            failed++;
            System.out.println("FAILED: testExpiredEntriesNotReturned - " + e.getMessage());
        }

        try {
            testThreadSafety();
            passed++;
        } catch (AssertionError e) {
            failed++;
            System.out.println("FAILED: testThreadSafety - " + e.getMessage());
        }

        try {
            testConstantTimeAccess();
            passed++;
        } catch (AssertionError e) {
            failed++;
            System.out.println("FAILED: testConstantTimeAccess - " + e.getMessage());
        }

        try {
            testNoGlobalLocking();
            passed++;
        } catch (AssertionError e) {
            failed++;
            System.out.println("FAILED: testNoGlobalLocking - " + e.getMessage());
        }

        try {
            testDeterministicEviction();
            passed++;
        } catch (AssertionError e) {
            failed++;
            System.out.println("FAILED: testDeterministicEviction - " + e.getMessage());
        }

        try {
            testConcurrentAccessNoCorruption();
            passed++;
        } catch (AssertionError e) {
            failed++;
            System.out.println("FAILED: testConcurrentAccessNoCorruption - " + e.getMessage());
        }

        System.out.println("\n" + passed + " passed, " + failed + " failed");
        if (failed > 0) {
            System.exit(1);
        }
    }

    static void testCapacityNeverExceeded() {
        BoundedCache<Integer, Integer> cache = new BoundedCache<>(3);
        cache.put(1, 1, 10000);
        cache.put(2, 2, 10000);
        cache.put(3, 3, 10000);
        cache.put(4, 4, 10000);
        cache.put(5, 5, 10000);

        int count = 0;
        for (int i = 1; i <= 5; i++) {
            if (cache.get(i) != null)
                count++;
        }
        assertEqual(3, count, "capacity should never exceed 3");
    }

    static void testLRUEviction() {
        BoundedCache<String, String> cache = new BoundedCache<>(3);
        cache.put("a", "1", 10000);
        cache.put("b", "2", 10000);
        cache.put("c", "3", 10000);

        cache.get("a");

        cache.put("d", "4", 10000);

        assertNotNull(cache.get("a"), "recently used 'a' should remain");
        assertNull(cache.get("b"), "least recently used 'b' should be evicted");
        assertNotNull(cache.get("c"), "'c' should remain");
        assertNotNull(cache.get("d"), "'d' should remain");
    }

    static void testExpiredEntriesNotReturned() throws Exception {
        BoundedCache<String, String> cache = new BoundedCache<>(3);
        cache.put("key", "value", 50);
        Thread.sleep(100);
        assertNull(cache.get("key"), "expired entry should not be returned");
    }

    static void testThreadSafety() throws Exception {
        BoundedCache<Integer, Integer> cache = new BoundedCache<>(100);
        Thread[] threads = new Thread[10];
        final boolean[] errors = { false };

        for (int t = 0; t < 10; t++) {
            final int id = t;
            threads[t] = new Thread(() -> {
                for (int i = 0; i < 1000; i++) {
                    int key = id * 1000 + i;
                    cache.put(key, key, 10000);
                    Integer val = cache.get(key);
                    if (val != null && !val.equals(key)) {
                        errors[0] = true;
                    }
                }
            });
        }

        for (Thread t : threads)
            t.start();
        for (Thread t : threads)
            t.join();

        assertFalse(errors[0], "concurrent access should not corrupt values");
    }

    static void testConstantTimeAccess() {
        BoundedCache<Integer, Integer> cache = new BoundedCache<>(10000);
        for (int i = 0; i < 10000; i++) {
            cache.put(i, i, 10000);
        }

        long start = System.nanoTime();
        for (int i = 0; i < 1000; i++) {
            cache.get(i);
            cache.put(i + 10000, i, 10000);
        }
        long elapsed = System.nanoTime() - start;

        assertTrue(elapsed < 100_000_000, "operations should complete quickly (< 100ms)");
    }

    static void testNoGlobalLocking() throws Exception {
        BoundedCache<Integer, Integer> cache = new BoundedCache<>(1000);
        Thread[] threads = new Thread[16];
        long start = System.nanoTime();

        for (int t = 0; t < 16; t++) {
            final int id = t;
            threads[t] = new Thread(() -> {
                for (int i = 0; i < 1000; i++) {
                    cache.put(id * 10000 + i, i, 10000);
                    cache.get(id * 10000 + i);
                }
            });
        }

        for (Thread t : threads)
            t.start();
        for (Thread t : threads)
            t.join();
        long elapsed = System.nanoTime() - start;

        assertTrue(elapsed < 5_000_000_000L, "parallel operations should complete within 5s");
    }

    static void testDeterministicEviction() {
        for (int run = 0; run < 3; run++) {
            BoundedCache<String, String> cache = new BoundedCache<>(2);
            cache.put("first", "1", 10000);
            cache.put("second", "2", 10000);
            cache.put("third", "3", 10000);

            assertNull(cache.get("first"), "first entry should always be evicted");
            assertNotNull(cache.get("second"), "second entry should remain");
            assertNotNull(cache.get("third"), "third entry should remain");
        }
    }

    static void testConcurrentAccessNoCorruption() throws Exception {
        BoundedCache<String, Integer> cache = new BoundedCache<>(10);
        Thread[] threads = new Thread[20];

        for (int t = 0; t < 20; t++) {
            final int id = t;
            threads[t] = new Thread(() -> {
                for (int i = 0; i < 100; i++) {
                    cache.put("shared", id, 10000);
                    cache.get("shared");
                }
            });
        }

        for (Thread t : threads)
            t.start();
        for (Thread t : threads)
            t.join();

        Integer result = cache.get("shared");
        assertNotNull(result, "shared key should exist");
        assertTrue(result >= 0 && result < 20, "value should be valid thread id");
    }

    static void assertEqual(int expected, int actual, String msg) {
        if (expected != actual) {
            throw new AssertionError(msg + " (expected " + expected + ", got " + actual + ")");
        }
    }

    static void assertNull(Object obj, String msg) {
        if (obj != null) {
            throw new AssertionError(msg);
        }
    }

    static void assertNotNull(Object obj, String msg) {
        if (obj == null) {
            throw new AssertionError(msg);
        }
    }

    static void assertTrue(boolean condition, String msg) {
        if (!condition) {
            throw new AssertionError(msg);
        }
    }

    static void assertFalse(boolean condition, String msg) {
        if (condition) {
            throw new AssertionError(msg);
        }
    }
}
