package com.example.inventory;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    @PostMapping("/aggregate")
    public ResponseEntity<Map<String, Integer>> aggregate(@RequestBody List<Item> items) {
        if (items == null) {
            return ResponseEntity.badRequest().build();
        }

        Map<String, Integer> totals = new HashMap<>();

        for (Item item : items) {
            if (item.getSku() == null || item.getSku().isEmpty()) {
                continue; // Or throw bad request, depending on requirements. Ignoring invalid SKUs for now.
            }
            if (item.getQuantity() < 0) {
                 return ResponseEntity.badRequest().build(); // Negative quantity is invalid
            }
            
            totals.merge(item.getSku(), item.getQuantity(), Integer::sum);
        }

        return ResponseEntity.ok(totals);
    }
}
