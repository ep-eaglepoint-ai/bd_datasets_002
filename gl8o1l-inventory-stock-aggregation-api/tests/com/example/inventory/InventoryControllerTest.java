package com.example.inventory;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class InventoryControllerTest {

    private final InventoryController controller = new InventoryController();

    // ========== Basic Functionality Tests ==========

    @Test
    void testAggregate_Success() {
        List<Item> items = Arrays.asList(
            new Item("A", 10),
            new Item("B", 5),
            new Item("A", 20),
            new Item("C", 1)
        );

        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        
        @SuppressWarnings("unchecked")
        Map<String, Integer> result = (Map<String, Integer>) response.getBody();
        assertNotNull(result);
        assertEquals(30, result.get("A"));
        assertEquals(5, result.get("B"));
        assertEquals(1, result.get("C"));
    }

    @Test
    void testAggregate_EmptyList() {
        ResponseEntity<?> response = controller.aggregate(new ArrayList<>());
        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Integer> result = (Map<String, Integer>) response.getBody();
        assertTrue(result.isEmpty());
    }

    @Test
    void testAggregate_SingleItem() {
        List<Item> items = Collections.singletonList(new Item("SINGLE-SKU", 42));
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        
        @SuppressWarnings("unchecked")
        Map<String, Integer> result = (Map<String, Integer>) response.getBody();
        assertEquals(1, result.size());
        assertEquals(42, result.get("SINGLE-SKU"));
    }

    @Test
    void testAggregate_AllDuplicateSkus() {
        List<Item> items = Arrays.asList(
            new Item("DUPLICATE", 10),
            new Item("DUPLICATE", 20),
            new Item("DUPLICATE", 30)
        );
        
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        
        @SuppressWarnings("unchecked")
        Map<String, Integer> result = (Map<String, Integer>) response.getBody();
        assertEquals(1, result.size());
        assertEquals(60, result.get("DUPLICATE"));
    }

    @Test
    void testAggregate_ZeroQuantity() {
        List<Item> items = Arrays.asList(
            new Item("A", 0),
            new Item("B", 10)
        );
        
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        
        @SuppressWarnings("unchecked")
        Map<String, Integer> result = (Map<String, Integer>) response.getBody();
        assertEquals(0, result.get("A"));
        assertEquals(10, result.get("B"));
    }

    @Test
    void testAggregate_MaxIntegerQuantity() {
        List<Item> items = Collections.singletonList(new Item("MAX", Integer.MAX_VALUE));
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        
        @SuppressWarnings("unchecked")
        Map<String, Integer> result = (Map<String, Integer>) response.getBody();
        assertEquals(Integer.MAX_VALUE, result.get("MAX"));
    }

    // ========== Input Validation Tests ==========

    @Test
    void testAggregate_NullInput() {
        ResponseEntity<?> response = controller.aggregate(null);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse error = (ErrorResponse) response.getBody();
        assertNotNull(error);
        assertEquals(400, error.getStatus());
        assertEquals("Bad Request", error.getError());
        assertEquals("Request body cannot be null", error.getMessage());
        assertNotNull(error.getTimestamp());
    }

    @Test
    void testAggregate_NullSku() {
        List<Item> items = Collections.singletonList(new Item(null, 10));
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse error = (ErrorResponse) response.getBody();
        assertNotNull(error);
        assertEquals("Invalid items in request", error.getMessage());
        assertTrue(error.getDetails().get(0).contains("null SKU"));
    }

    @Test
    void testAggregate_EmptyStringSku() {
        List<Item> items = Collections.singletonList(new Item("", 10));
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse error = (ErrorResponse) response.getBody();
        assertNotNull(error);
        assertTrue(error.getDetails().get(0).contains("empty SKU"));
    }

    @Test
    void testAggregate_WhitespaceOnlySku() {
        List<Item> items = Collections.singletonList(new Item("   ", 10));
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse error = (ErrorResponse) response.getBody();
        assertNotNull(error);
        assertTrue(error.getDetails().get(0).contains("whitespace-only SKU"));
    }

    @Test
    void testAggregate_VeryLongSku() {
        String longSku = "A".repeat(256); // Exceeds MAX_SKU_LENGTH of 255
        List<Item> items = Collections.singletonList(new Item(longSku, 10));
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse error = (ErrorResponse) response.getBody();
        assertNotNull(error);
        assertTrue(error.getDetails().get(0).contains("exceeding maximum length"));
    }

    @Test
    void testAggregate_NegativeQuantity() {
        List<Item> items = Collections.singletonList(new Item("A", -5));
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse error = (ErrorResponse) response.getBody();
        assertNotNull(error);
        assertTrue(error.getDetails().get(0).contains("negative quantity"));
    }

    @Test
    void testAggregate_NullItemInList() {
        List<Item> items = new ArrayList<>();
        items.add(new Item("A", 10));
        items.add(null);
        items.add(new Item("B", 5));
        
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse error = (ErrorResponse) response.getBody();
        assertNotNull(error);
        assertTrue(error.getDetails().get(0).contains("is null"));
    }

    @Test
    void testAggregate_MixedValidAndInvalidItems() {
        List<Item> items = Arrays.asList(
            new Item("VALID", 10),
            new Item("", 5),           // Empty SKU
            new Item("ALSO-VALID", 20),
            new Item("BAD", -1)        // Negative quantity
        );
        
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse error = (ErrorResponse) response.getBody();
        assertNotNull(error);
        assertEquals(2, error.getDetails().size()); // Two validation errors
        assertTrue(error.getDetails().stream().anyMatch(d -> d.contains("empty SKU")));
        assertTrue(error.getDetails().stream().anyMatch(d -> d.contains("negative quantity")));
    }

    // ========== Edge Cases ==========

    @Test
    void testAggregate_CaseSensitivity() {
        List<Item> items = Arrays.asList(
            new Item("SKU-A", 10),
            new Item("sku-a", 20),
            new Item("SKU-A", 5)
        );
        
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        
        @SuppressWarnings("unchecked")
        Map<String, Integer> result = (Map<String, Integer>) response.getBody();
        assertEquals(15, result.get("SKU-A"));  // 10 + 5
        assertEquals(20, result.get("sku-a"));  // Different SKU
    }

    @Test
    void testAggregate_SpecialCharactersInSku() {
        List<Item> items = Arrays.asList(
            new Item("SKU-123!@#$%", 10),
            new Item("SKU_WITH_UNDERSCORES", 20),
            new Item("SKU.WITH.DOTS", 30)
        );
        
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        
        @SuppressWarnings("unchecked")
        Map<String, Integer> result = (Map<String, Integer>) response.getBody();
        assertEquals(10, result.get("SKU-123!@#$%"));
        assertEquals(20, result.get("SKU_WITH_UNDERSCORES"));
        assertEquals(30, result.get("SKU.WITH.DOTS"));
    }

    @Test
    void testAggregate_UnicodeInSku() {
        List<Item> items = Arrays.asList(
            new Item("SKU-日本語", 10),
            new Item("SKU-العربية", 20),
            new Item("SKU-🚀", 30)
        );
        
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        
        @SuppressWarnings("unchecked")
        Map<String, Integer> result = (Map<String, Integer>) response.getBody();
        assertEquals(10, result.get("SKU-日本語"));
        assertEquals(20, result.get("SKU-العربية"));
        assertEquals(30, result.get("SKU-🚀"));
    }

    // ========== Error Response Structure Tests ==========

    @Test
    void testAggregate_ErrorResponseStructure_Complete() {
        List<Item> items = Arrays.asList(
            new Item(null, 10),
            new Item("", 5),
            new Item("VALID", -1)
        );
        
        ResponseEntity<?> response = controller.aggregate(items);
        ErrorResponse error = (ErrorResponse) response.getBody();
        
        assertNotNull(error);
        assertNotNull(error.getTimestamp());
        assertEquals(400, error.getStatus());
        assertEquals("Bad Request", error.getError());
        assertEquals("Invalid items in request", error.getMessage());
        assertNotNull(error.getDetails());
        assertEquals(3, error.getDetails().size());
    }

    @Test
    void testAggregate_ErrorResponseDetails_Specificity() {
        List<Item> items = Collections.singletonList(new Item("A", -10));
        ResponseEntity<?> response = controller.aggregate(items);
        ErrorResponse error = (ErrorResponse) response.getBody();
        
        assertNotNull(error);
        String detail = error.getDetails().get(0);
        assertTrue(detail.contains("index 0"));
        assertTrue(detail.contains("SKU: A"));
        assertTrue(detail.contains("-10"));
    }

    // ========== Performance Tests ==========

    @Test
    void testAggregate_LargeDataset() {
        List<Item> items = new ArrayList<>();
        int count = 10000;
        for (int i = 0; i < count; i++) {
            items.add(new Item("SKU-" + (i % 10), 1));
        }

        long start = System.currentTimeMillis();
        ResponseEntity<?> response = controller.aggregate(items);
        long duration = System.currentTimeMillis() - start;

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Integer> result = (Map<String, Integer>) response.getBody();
        assertEquals(10, result.size());
        assertEquals(count / 10, result.get("SKU-0"));
        
        assertTrue(duration < 2000, "Aggregation took too long: " + duration + "ms");
    }

    @Test
    void testAggregate_Concurrency() throws InterruptedException {
        int threadCount = 10;
        int requestsPerThread = 100;
        List<Item> items = Arrays.asList(new Item("A", 1), new Item("B", 1));

        List<Thread> threads = new ArrayList<>();
        java.util.concurrent.atomic.AtomicInteger errors = new java.util.concurrent.atomic.AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            Thread t = new Thread(() -> {
                for (int j = 0; j < requestsPerThread; j++) {
                    try {
                        ResponseEntity<?> response = controller.aggregate(items);
                        if (response.getStatusCode() != HttpStatus.OK) {
                            errors.incrementAndGet();
                        } else {
                            @SuppressWarnings("unchecked")
                            Map<String, Integer> result = (Map<String, Integer>) response.getBody();
                            if (result.get("A") != 1) {
                                errors.incrementAndGet();
                            }
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

    // ========== Integration Tests ==========

    @Test
    void testAggregate_RealisticPayload() {
        List<Item> items = Arrays.asList(
            new Item("LAPTOP-001", 5),
            new Item("MOUSE-USB-001", 150),
            new Item("KEYBOARD-MECH-001", 75),
            new Item("LAPTOP-001", 3),
            new Item("MONITOR-27-001", 20),
            new Item("MOUSE-USB-001", 50),
            new Item("CABLE-HDMI-2M", 200),
            new Item("LAPTOP-001", 2)
        );
        
        ResponseEntity<?> response = controller.aggregate(items);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        
        @SuppressWarnings("unchecked")
        Map<String, Integer> result = (Map<String, Integer>) response.getBody();
        assertEquals(5, result.size());
        assertEquals(10, result.get("LAPTOP-001"));
        assertEquals(200, result.get("MOUSE-USB-001"));
        assertEquals(75, result.get("KEYBOARD-MECH-001"));
        assertEquals(20, result.get("MONITOR-27-001"));
        assertEquals(200, result.get("CABLE-HDMI-2M"));
    }

    @Test
    void testAggregate_ResponseFormatConsistency() {
        // Test that successful responses always return Map<String, Integer>
        List<Item> items = Collections.singletonList(new Item("TEST", 1));
        ResponseEntity<?> response = controller.aggregate(items);
        
        assertTrue(response.getBody() instanceof Map);
        @SuppressWarnings("unchecked")
        Map<String, Integer> result = (Map<String, Integer>) response.getBody();
        assertNotNull(result);
        
        // Test that error responses always return ErrorResponse
        ResponseEntity<?> errorResponse = controller.aggregate(null);
        assertTrue(errorResponse.getBody() instanceof ErrorResponse);
    }
}
