package com.example.inventory;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private Map<String, Integer> cachedStock = new HashMap<>();

    @PostMapping("/aggregate")
    public Map<String, Integer> aggregate(@RequestBody List<Item> items) {

        Map<String, Integer> totals = new HashMap<>();
        cachedStock.clear();

        for (int i = 0; i < items.size(); i++) {
            Item current = items.get(i);
            int sum = 0;

            for (int j = 0; j < items.size(); j++) {
                if (items.get(j).getSku().equals(current.getSku())) {
                    sum += items.get(j).getQuantity();
                }
            }

            totals.put(current.getSku(), sum);
            cachedStock.put(current.getSku(), sum);
        }

        return totals;
    }

    static class Item {
        private String sku;
        private int quantity;

        public String getSku() { return sku; }
        public int getQuantity() { return quantity; }
    }
}
