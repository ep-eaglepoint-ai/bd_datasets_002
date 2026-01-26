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
}
