package com.example.inventory;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class InventoryControllerTest {

    private final InventoryController controller = new InventoryController();

    @Test
    void testAggregate_Success() {
        List<Item> items = Arrays.asList(
            new Item("A", 10),
            new Item("B", 5),
            new Item("A", 20),
            new Item("C", 1)
        );

        ResponseEntity<Map<String, Integer>> response = controller.aggregate(items);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        
        Map<String, Integer> result = response.getBody();
        assertNotNull(result);
        assertEquals(30, result.get("A"));
        assertEquals(5, result.get("B"));
        assertEquals(1, result.get("C"));
    }

    @Test
    void testAggregate_EmptyList() {
        ResponseEntity<Map<String, Integer>> response = controller.aggregate(new ArrayList<>());
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isEmpty());
    }

    @Test
    void testAggregate_NullInput() {
        ResponseEntity<Map<String, Integer>> response = controller.aggregate(null);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void testAggregate_NegativeQuantity() {
        List<Item> items = Collections.singletonList(new Item("A", -5));
        ResponseEntity<Map<String, Integer>> response = controller.aggregate(items);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void testAggregate_NullSku() {
        List<Item> items = Collections.singletonList(new Item(null, 10));
        ResponseEntity<Map<String, Integer>> response = controller.aggregate(items);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isEmpty()); // Should ignore null sku
    }

    @Test
    void testAggregate_LargeDataset() {
        List<Item> items = new ArrayList<>();
        int count = 10000;
        for (int i = 0; i < count; i++) {
            items.add(new Item("SKU-" + (i % 10), 1));
        }

        long start = System.currentTimeMillis();
        ResponseEntity<Map<String, Integer>> response = controller.aggregate(items);
        long duration = System.currentTimeMillis() - start;

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(10, response.getBody().size());
        assertEquals(count / 10, response.getBody().get("SKU-0"));
        
        // Performance assertion (loose upper bound to avoid flakiness, but ensures O(n) vs O(n^2))
        // O(n^2) for 10k items would be significantly slower (e.g., millions of ops).
        // 10k items should be sub-100ms easily.
        assertTrue(duration < 2000, "Aggregation took too long: " + duration + "ms");
    }

    @Test
    void testAggregate_Concurrency() throws InterruptedException {
        int threadCount = 10;
        int requestsPerThread = 100;
        List<Item> items = Arrays.asList(new Item("A", 1), new Item("B", 1));

        List<Thread> threads = new ArrayList<>();
        // We aren't testing shared state mutation (since we removed it), 
        // but we are testing that concurrent requests don't crash or interfere.
        // Since variables are local, this effectively tests statelessness.
        
        java.util.concurrent.atomic.AtomicInteger errors = new java.util.concurrent.atomic.AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            Thread t = new Thread(() -> {
                for (int j = 0; j < requestsPerThread; j++) {
                    try {
                        ResponseEntity<Map<String, Integer>> response = controller.aggregate(items);
                        if (response.getStatusCode() != HttpStatus.OK || 
                            response.getBody().get("A") != 1) {
                            errors.incrementAndGet();
                        }
                    } catch (Exception e) {
                        errors.incrementAndGet();
                    }
                }
            });
            threads.add(t);
            t.start();
        }

        for (Thread t : threads) {
            t.join();
        }

        assertEquals(0, errors.get(), "Concurrent execution produced errors");
    }
}
