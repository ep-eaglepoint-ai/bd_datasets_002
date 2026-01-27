package com.example.inventory;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private static final int MAX_SKU_LENGTH = 255;

    @PostMapping("/aggregate")
    public ResponseEntity<?> aggregate(@RequestBody List<Item> items) {
        // Validate request body
        if (items == null) {
            ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Request body cannot be null"
            );
            return ResponseEntity.badRequest().body(error);
        }

        // Validate each item
        List<String> validationErrors = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            Item item = items.get(i);
            
            if (item == null) {
                validationErrors.add("Item at index " + i + " is null");
                continue;
            }
            
            String sku = item.getSku();
            
            // Validate SKU
            if (sku == null) {
                validationErrors.add("Item at index " + i + " has null SKU");
            } else if (sku.isEmpty()) {
                validationErrors.add("Item at index " + i + " has empty SKU");
            } else if (sku.trim().isEmpty()) {
                validationErrors.add("Item at index " + i + " has whitespace-only SKU");
            } else if (sku.length() > MAX_SKU_LENGTH) {
                validationErrors.add("Item at index " + i + " has SKU exceeding maximum length of " + MAX_SKU_LENGTH + " characters");
            }
            
            // Validate quantity
            if (item.getQuantity() < 0) {
                validationErrors.add("Item at index " + i + " (SKU: " + sku + ") has negative quantity: " + item.getQuantity());
            }
        }

        // Return validation errors if any
        if (!validationErrors.isEmpty()) {
            ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Invalid items in request",
                validationErrors
            );
            return ResponseEntity.badRequest().body(error);
        }

        // Perform aggregation
        Map<String, Integer> totals = new HashMap<>();
        for (Item item : items) {
            totals.merge(item.getSku(), item.getQuantity(), Integer::sum);
        }

        return ResponseEntity.ok(totals);
    }
}
